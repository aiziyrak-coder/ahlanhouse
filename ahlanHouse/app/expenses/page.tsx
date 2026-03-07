"use client";
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { SortableTableHead, type SortDirection } from "@/components/sortable-table-head";
import { sortByKey } from "@/lib/table-sort";
import { useRouter, useSearchParams } from "next/navigation";
import {
    Plus,
    DollarSign,
    Building,
    Trash2,
    Loader2,
    HandCoins,
    ArrowUpDown,
    Pencil,
    Trash,
    Camera,
} from "lucide-react";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";
import toast, { Toaster } from "react-hot-toast";
import { getApiBaseUrl, getApiRoot, clearAuthAndRedirect } from "@/app/lib/api";

const API_BASE_URL = getApiBaseUrl();
const TELEGRAM_CHAT_ID = process.env.NEXT_PUBLIC_TELEGRAM_CHAT_ID || "-1003733316489";

const parsePaidAmountFromComment = (comment: string | null | undefined): { paidAmount: number; originalComment: string } => {
    if (!comment) return { paidAmount: 0, originalComment: "" };
    const regex = / \[PAID:(\d+\.?\d*)]$/;
    const match = comment.match(regex);
    if (match && match[1]) {
        return {
            paidAmount: parseFloat(match[1]),
            originalComment: comment.replace(regex, "").trim(),
        };
    }
    return { paidAmount: 0, originalComment: comment };
};

const createUpdatedComment = (originalComment: string, newPaidAmount: number): string => {
    const cleanOriginalComment = parsePaidAmountFromComment(originalComment).originalComment;
    if (newPaidAmount > 0.01) {
        return `${cleanOriginalComment} [PAID:${newPaidAmount.toFixed(2)}]`;
    }
    return cleanOriginalComment;
};

/** Telegram xabari backend proxy orqali (CORS va token xavfsizligi). getHeaders komponentdan beriladi. */
const sendTelegramNotification = async (message: string, getHeaders: () => HeadersInit | null) => {
    try {
        const headers = getHeaders();
        if (!headers) return;
        const res = await fetch(`${API_BASE_URL}/telegram/send-message/`, {
            method: "POST",
            headers: { ...headers, "Content-Type": "application/json" },
            body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text: message, parse_mode: "HTML" }),
        });
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error((err as { detail?: string }).detail || res.statusText);
        }
    } catch (error) {
        console.error("Telegram xabarini yuborishda xatolik:", error);
    }
};

function useDebounce<T>(value: T, delay: number): T {
    const [debouncedValue, setDebouncedValue] = useState<T>(value);
    useEffect(() => {
        const handler = setTimeout(() => { setDebouncedValue(value); }, delay);
        return () => { clearTimeout(handler); };
    }, [value, delay]);
    return debouncedValue;
}

interface Expense {
    id: number;
    amount: string;
    date: string;
    supplier: number;
    supplier_name: string;
    comment: string;
    expense_type: number;
    expense_type_name: string;
    object: number;
    object_name?: string;
    status: string;
    calculated_remaining_debt?: number;
    paid_from_comment?: number;
    original_comment?: string;
    image?: string | null;
    // Add property for multiple images
    images?: string[] | null;
}

interface SupplierDebtGroup {
    supplier: number;
    supplier_name: string;
    total_debt: number;
    expenses: Expense[];
}

interface Property { id: number; name: string; }
interface Supplier { id: number; company_name: string; }
interface ExpenseType { id: number; name: string; }

interface CurrentUser {
    fio: string;
    user_type: 'admin' | 'sotuvchi' | 'buxgalter' | 'mijoz' | string;
}

const initialFormData = {
    object: "",
    supplier: "",
    amount: "",
    expense_type: "",
    date: new Date().toISOString().split("T")[0],
    comment: "",
    status: "Nasiya",
};
const initialNewSupplierData = {
    company_name: "",
    contact_person_name: "",
    phone_number: "",
    address: "",
    description: "",
};

export default function ExpensesPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [properties, setProperties] = useState<Property[]>([]);
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [expenseTypes, setExpenseTypes] = useState<ExpenseType[]>([]);
    const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
    const [accessToken, setAccessToken] = useState<string | null>(null);
    const [isClient, setIsClient] = useState(false);
    
    const [loading, setLoading] = useState(true);
    const [loadingTotals, setLoadingTotals] = useState(true);
    
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSupplierSubmitting, setIsSupplierSubmitting] = useState(false);
    const [isExpenseTypeSubmitting, setIsExpenseTypeSubmitting] = useState(false);
    const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);

    const [open, setOpen] = useState(false);
    const [editOpen, setEditOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [isNasiyaDialogOpen, setIsNasiyaDialogOpen] = useState(false);
    const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
    const [addSupplierOpen, setAddSupplierOpen] = useState(false);
    const [addExpenseTypeOpen, setAddExpenseTypeOpen] = useState(false);
    
    const [currentExpense, setCurrentExpense] = useState<Expense | null>(null);
    const [expenseToDelete, setExpenseToDelete] = useState<number | null>(null);
    const [deleteCode, setDeleteCode] = useState("");
    
    const [formData, setFormData] = useState(initialFormData);
    const [newSupplierData, setNewSupplierData] = useState(initialNewSupplierData);
    const [newExpenseTypeName, setNewExpenseTypeName] = useState("");
    const [expenseImageFiles, setExpenseImageFiles] = useState<File[]>([]); // Changed from single file to array
    
    const [searchTerm, setSearchTerm] = useState('');
    const debouncedSearchTerm = useDebounce(searchTerm, 500);
    const [filters, setFilters] = useState({ object: "", expense_type: "", dateRange: "all" });
    
    const [tableSortKey, setTableSortKey] = useState<string | null>('date');
    const [tableSortDir, setTableSortDir] = useState<SortDirection>('desc');
    
    const [nasiyaData, setNasiyaData] = useState<SupplierDebtGroup[]>([]);
    const [currentPaymentSupplier, setCurrentPaymentSupplier] = useState<SupplierDebtGroup | null>(null);
    const [paymentAmount, setPaymentAmount] = useState("");
    const [paymentDescription, setPaymentDescription] = useState("");

    const [filteredTotalAmount, setFilteredTotalAmount] = useState<number>(0);
    const [filteredPaidExpensesAmount, setFilteredPaidExpensesAmount] = useState<number>(0);
    const [filteredPendingAmount, setFilteredPendingAmount] = useState<number>(0);
    const [selectedObjectTotal, setSelectedObjectTotal] = useState<number | null>(null);
    
    // Image preview state - moved to correct location to fix hook order error
    const [imagePreviewOpen, setImagePreviewOpen] = useState(false);
    const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
    const [imageGalleryOpen, setImageGalleryOpen] = useState(false);
    const [galleryImages, setGalleryImages] = useState<string[]>([]);
    const [currentGalleryImageIndex, setCurrentGalleryImageIndex] = useState(0);
    
    useEffect(() => {
        setIsClient(true);
        const token = localStorage.getItem("access_token");
        if (token) {
            setAccessToken(token);
            const userTypeFromStorage = localStorage.getItem("user_type");
            const userFioFromStorage = localStorage.getItem("user_fio");
            if (userTypeFromStorage && userFioFromStorage) {
                setCurrentUser({ user_type: userTypeFromStorage as CurrentUser['user_type'], fio: userFioFromStorage });
            }
        } else {
            toast.error("Iltimos tizimga kiring va davom eting");
            router.push("/login");
        }
    }, [router]);

    /** Ziyrak: openAdd=1 -> add dialog; object=id -> set object filter */
    useEffect(() => {
        const openAdd = searchParams.get("openAdd") === "1";
        const objectId = searchParams.get("object");
        if (openAdd) {
            setOpen(true);
            const u = new URL(window.location.href);
            u.searchParams.delete("openAdd");
            window.history.replaceState({}, "", u.pathname + (u.search || ""));
        }
        if (objectId) setFilters((prev) => ({ ...prev, object: objectId }));
    }, [searchParams]);

    const getAuthHeaders = useCallback((): HeadersInit => {
        if (!accessToken) return { Accept: "application/json", "Content-Type": "application/json" };
        return {
            Accept: "application/json",
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
        };
    }, [accessToken]);

    const fetchAllPaginatedData = useCallback(async (endpoint: string, queryParams: URLSearchParams): Promise<any[]> => {
        if (!accessToken) return [];
        let allResults: any[] = [];
        queryParams.set("page_size", "200");
        let nextUrl: string | null = `${API_BASE_URL}${endpoint}?${queryParams.toString()}`;
        while (nextUrl) {
            try {
                const response: Response = await fetch(nextUrl, { headers: getAuthHeaders() });
                if (response.status === 401) {
                    clearAuthAndRedirect(router);
                    return [];
                }
                if (!response.ok) break;
                const pageData: { results: any[]; next: string | null } = await response.json();
                allResults = allResults.concat(pageData.results || []);
                nextUrl = pageData.next;
            } catch (error) {
                break;
            }
        }
        return allResults;
    }, [accessToken, getAuthHeaders, router]);
    
    const fetchInitialData = useCallback(async () => {
        if (!accessToken) return;
        try {
            const [props, supps, types] = await Promise.all([
                fetchAllPaginatedData("/objects/", new URLSearchParams()),
                fetchAllPaginatedData("/suppliers/", new URLSearchParams()),
                fetchAllPaginatedData("/expense-types/", new URLSearchParams()),
            ]);
            setProperties(props);
            setSuppliers(supps);
            setExpenseTypes(types);
        } catch (error: any) {
            toast.error(`Boshlang'ich ma'lumotlar yuklanmadi`);
        }
    }, [accessToken, fetchAllPaginatedData]);

    useEffect(() => {
        if (accessToken) fetchInitialData();
    }, [accessToken, fetchInitialData]);
    
    const formatCurrency = (amount: number | string | undefined | null) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(amount || 0));

    const fetchExpensesAndTotals = useCallback(async () => {
        if (!accessToken || !isClient) return { totalAmount: 0, paidAmount: 0, pendingDebt: 0 };
        setLoading(true);
        setLoadingTotals(true);

        const queryParams = new URLSearchParams();
        if (filters.object) queryParams.append("object", filters.object);
        if (filters.expense_type) queryParams.append("expense_type", filters.expense_type);
        if (filters.dateRange && filters.dateRange !== "all") {
            const today = new Date();
            let startDate = new Date(today);
            switch (filters.dateRange) {
                case "today": startDate.setHours(0, 0, 0, 0); break;
                case "week": startDate.setDate(today.getDate() - 7); break;
                case "month": startDate.setMonth(today.getMonth() - 1); break;
                case "quarter": startDate.setMonth(today.getMonth() - 3); break;
                case "year": startDate.setFullYear(today.getFullYear() - 1); break;
            }
            queryParams.append("date__gte", startDate.toISOString().split("T")[0]);
            if (filters.dateRange === "today") queryParams.append("date__lte", today.toISOString().split("T")[0]);
        }
        if (debouncedSearchTerm) queryParams.append("search", debouncedSearchTerm);
        
        let totalAmount = 0, paidAmount = 0, pendingDebt = 0, objectTotal = 0;
        try {
            const allExpenses = await fetchAllPaginatedData("/expenses/", queryParams);
            setExpenses(allExpenses);

            const objectIdNum = Number(filters.object);

            for (const exp of allExpenses) {
                const amount = Number(exp.amount || 0);
                totalAmount += amount;
                if (filters.object && exp.object === objectIdNum) objectTotal += amount;
                
                if (exp.status === 'To‘langan') {
                    paidAmount += amount;
                } else {
                    const { paidAmount: paidFromComment } = parsePaidAmountFromComment(exp.comment);
                    const remaining = amount - paidFromComment;
                    paidAmount += paidFromComment;
                    if (remaining > 0.009) {
                        pendingDebt += remaining;
                    }
                }
            }
            setFilteredTotalAmount(totalAmount);
            setFilteredPaidExpensesAmount(paidAmount);
            setFilteredPendingAmount(pendingDebt);
            setSelectedObjectTotal(filters.object ? objectTotal : null);
        } catch (error) {
            setExpenses([]);
        } finally {
            setLoading(false);
            setLoadingTotals(false);
        }
        return { totalAmount, paidAmount, pendingDebt };
    }, [accessToken, isClient, filters, debouncedSearchTerm, fetchAllPaginatedData]);
    
    useEffect(() => {
        fetchExpensesAndTotals();
    }, [fetchExpensesAndTotals]);

    const handleSort = (field: keyof Expense) => {
        if (tableSortKey === field) {
            setTableSortDir(tableSortDir === 'asc' ? 'desc' : 'asc');
        } else {
            setTableSortKey(field);
            setTableSortDir('desc');
        }
    };

    const sortedExpenses = useMemo(() => {
        return [...expenses].sort((a, b) => {
            if (!tableSortKey) return 0;
            const aValue = a[tableSortKey as keyof Expense];
            const bValue = b[tableSortKey as keyof Expense];
            let comparison = 0;
            if (tableSortKey === 'status') {
                const order = { 'Kutilmoqda': 1, 'Qismiy to‘langan': 2, 'To‘langan': 3 };
                comparison = (order[aValue as keyof typeof order] || 99) - (order[bValue as keyof typeof order] || 99);
            } else if (tableSortKey === 'amount') {
                comparison = parseFloat(aValue as string) - parseFloat(bValue as string);
            } else if (tableSortKey === 'date') {
                comparison = new Date(a.date).getTime() - new Date(b.date).getTime();
            } else if (typeof aValue === 'string' && typeof bValue === 'string') {
                comparison = aValue.localeCompare(bValue);
            } else if (typeof aValue === 'number' && typeof bValue === 'number') {
                comparison = aValue - bValue;
            }
            return tableSortDir === 'asc' ? comparison : -comparison;
        });
    }, [expenses, tableSortKey, tableSortDir]);
    
    const handleActionAndRefetch = async (action: () => Promise<any>) => {
        try {
            await action();
        } catch (error: any) {
            toast.error(error.message || "Amaliyotda xatolik");
        } finally {
            fetchExpensesAndTotals();
        }
    };

    const validateFormData = (): boolean => {
        if (!formData.object || !formData.supplier || !formData.expense_type || !formData.date || !formData.comment.trim() || !formData.status || !formData.amount || Number(formData.amount) <= 0) {
            toast.error("Barcha * belgili maydonlarni to'g'ri to'ldiring.");
            return false;
        }
        return true;
    };
    
    /** Rasmni Telegramga backend proxy orqali (CORS va token xavfsizligi). FormData uchun Content-Type ni o'rnatmaymiz — brauzer multipart/form-data + boundary qo'yadi. */
    const sendImageToTelegram = async (imageFile: File, caption: string) => {
        const authHeaders = getAuthHeaders() as Record<string, string>;
        if (!authHeaders?.Authorization) return;
        const { "Content-Type": _ct, ...headers } = authHeaders;
        const formData = new FormData();
        formData.append("chat_id", TELEGRAM_CHAT_ID);
        formData.append("photo", imageFile, imageFile.name || "image.jpg");
        formData.append("caption", caption);
        formData.append("parse_mode", "HTML");
        try {
            const response = await fetch(`${API_BASE_URL}/telegram/send-photo/`, { method: "POST", headers, body: formData });
            const result = await response.json();
            if (!response.ok) throw new Error((result as { detail?: string }).detail || "Telegramga yuborishda xato");
            if (result && !(result as { ok?: boolean }).ok) throw new Error((result as { description?: string }).description || "Telegramga yuborishda xato");
            toast.success("Xarajat rasmi Telegramga yuborildi.");
        } catch (error: unknown) {
            toast.error(`Rasm yuborilmadi: ${error instanceof Error ? error.message : "Noma'lum xato"}`);
        }
    };

    const formatDate = (dateString: string | undefined | null) => dateString ? format(new Date(dateString), "dd.MM.yyyy") : "-";
    const getObjectName = (objectId: number | undefined) => properties.find(p => p.id === objectId)?.name || `ID: ${objectId}`;
    
    const handleAddPayment = () => handleActionAndRefetch(async () => {
        if (!currentPaymentSupplier || !paymentAmount || Number(paymentAmount) <= 0 || !paymentDescription.trim()) {
            throw new Error("Iltimos, summa va tavsifni to'g'ri kiriting.");
        }
        setIsSubmittingPayment(true);
        try {
        const paymentData = { supplier: currentPaymentSupplier.supplier, amount: Number(paymentAmount), payment_type: 'naqd', description: paymentDescription.trim() };
        const paymentResponse = await fetch(`${API_BASE_URL}/supplier-payments/`, { method: 'POST', headers: getAuthHeaders(), body: JSON.stringify(paymentData) });
        if (!paymentResponse.ok) throw new Error("To'lovni saqlashda xatolik yuz berdi.");
        toast.success("To'lov muvaffaqiyatli saqlandi.");

        let paymentToDistribute = Number(paymentAmount);
        const updatePromises: Promise<any>[] = [];
        
        for (const expense of currentPaymentSupplier.expenses) {
            if (paymentToDistribute <= 0.009) break;
            const debtOnExpense = expense.calculated_remaining_debt || 0;
            if (debtOnExpense <= 0) continue;

            const paymentForThis = Math.min(paymentToDistribute, debtOnExpense);
            const newTotalPaidForExpense = (expense.paid_from_comment || 0) + paymentForThis;

            let newStatus = expense.status;
            let finalComment = createUpdatedComment(expense.original_comment || expense.comment, newTotalPaidForExpense);

            if (newTotalPaidForExpense >= Number(expense.amount) - 0.009) {
                newStatus = "To‘langan";
                finalComment = parsePaidAmountFromComment(finalComment).originalComment; 
            }

            const payload = { ...expense, status: newStatus, comment: finalComment };
            delete (payload as any).supplier_name; 
            delete (payload as any).expense_type_name; 
            delete (payload as any).object_name; 
            delete (payload as any).calculated_remaining_debt;
            delete (payload as any).paid_from_comment;
            delete (payload as any).original_comment;
            
            updatePromises.push( fetch(`${API_BASE_URL}/expenses/${expense.id}/`, { method: "PUT", headers: getAuthHeaders(), body: JSON.stringify(payload) }) );
            paymentToDistribute -= paymentForThis;
        }

        if (updatePromises.length > 0) await Promise.all(updatePromises);

        const updatedTotals = await fetchExpensesAndTotals();
        
        const oldDebt = currentPaymentSupplier.total_debt;
        const newDebt = oldDebt - Number(paymentAmount);
        let message = `<b>💰 Nasiya uchun to'lov</b>\n\n`+
                        `<b>Kim tomonidan:</b> ${currentUser?.fio || 'Noma`lum'}\n` +
                        `<b>Yetkazib beruvchi:</b> ${currentPaymentSupplier.supplier_name}\n\n`+
                        `<b>To'lov summasi:</b> ${formatCurrency(paymentAmount)}\n`+
                        `<b>Izoh:</b> ${paymentDescription.trim()}\n\n`+
                        `<b>Eski qarz:</b> ${formatCurrency(oldDebt)}\n`+
                        `<b>Yangi qarz:</b> ${formatCurrency(newDebt)}`;

        message += `\n\n➖➖➖➖➖\n` +
                   `<b>📊 Umumiy Holat:</b>\n` +
                   `<b>Jami Xarajat:</b> ${formatCurrency(updatedTotals.totalAmount)}\n` +
                   `<b>To'langan:</b> ${formatCurrency(updatedTotals.paidAmount)}\n` +
                   `<b>Nasiya qoldiq:</b> ${formatCurrency(updatedTotals.pendingDebt)}`;

        await sendTelegramNotification(message, getAuthHeaders);

        setIsPaymentDialogOpen(false); setIsNasiyaDialogOpen(false); setPaymentAmount(""); setPaymentDescription(""); setCurrentPaymentSupplier(null);
        } finally {
            setIsSubmittingPayment(false);
        }
    });

    const createExpense = () => handleActionAndRefetch(async () => {
        if (!validateFormData()) return;
        setIsSubmitting(true);
        try {
            const formPayload = new FormData();
            formPayload.append("object", formData.object);
            formPayload.append("supplier", formData.supplier);
            formPayload.append("amount", formData.amount);
            formPayload.append("expense_type", formData.expense_type);
            formPayload.append("date", formData.date);
            formPayload.append("comment", formData.comment.trim());
            formPayload.append("status", formData.status === "Naqd pul" ? "To'langan" : "Kutilmoqda");
            if (expenseImageFiles.length > 0) {
                formPayload.append("image", expenseImageFiles[0], expenseImageFiles[0].name || "image.jpg");
            }
            const headers: HeadersInit = { Authorization: `Bearer ${accessToken}` };
            const res = await fetch(`${API_BASE_URL}/expenses/`, { method: "POST", headers, body: formPayload });
            if (res.status === 401) { clearAuthAndRedirect(router); return; }
            if (!res.ok) {
                const errBody = await res.json().catch(() => ({}));
                const msg = errBody && typeof errBody === "object"
                    ? (Array.isArray(errBody)
                        ? errBody.join(", ")
                        : Object.entries(errBody)
                            .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : String(v)}`)
                            .join("; "))
                    : res.statusText;
                throw new Error(msg || "Xarajat qo'shilmadi");
            }
            const newExpense = await res.json();
            toast.success("Xarajat muvaffaqiyatli qo'shildi");

            const updatedTotals = await fetchExpensesAndTotals();

            const supplierName = suppliers.find(s => s.id === Number(formData.supplier))?.company_name;
            const objectName = properties.find(p => p.id === Number(formData.object))?.name;
            const expenseTypeName = expenseTypes.find(t => t.id === Number(formData.expense_type))?.name;
            let message = `<b>➕ Yangi Xarajat Qo'shildi</b>\n\n` +
                            `<b>Kim tomonidan:</b> ${currentUser?.fio || "Noma'lum"}\n` +
                            `<b>Obyekt:</b> ${objectName || '—'}\n`+
                            `<b>Yetkazib beruvchi:</b> ${supplierName || '—'}\n`+
                            `<b>Xarajat turi:</b> ${expenseTypeName || '—'}\n\n`+
                            `<b>Summa:</b> ${formatCurrency(formData.amount)}\n`+
                            `<b>Sana:</b> ${formatDate(formData.date)}\n`+
                            `<b>Holat:</b> ${formData.status}\n`+
                            `<b>Izoh:</b> ${formData.comment}`;
            message += `\n\n➖➖➖➖➖\n` +
                       `<b>📊 Umumiy Holat:</b>\n` +
                       `<b>Jami Xarajat:</b> ${formatCurrency(updatedTotals.totalAmount)}\n` +
                       `<b>To'langan:</b> ${formatCurrency(updatedTotals.paidAmount)}\n` +
                       `<b>Nasiya qoldiq:</b> ${formatCurrency(updatedTotals.pendingDebt)}`;
            await sendTelegramNotification(message, getAuthHeaders);

            for (let i = 0; i < expenseImageFiles.length; i++) {
                await sendImageToTelegram(expenseImageFiles[i], `Xarajat ID: ${newExpense.id} uchun rasm (${i + 1}/${expenseImageFiles.length})`);
            }
            setOpen(false); setFormData(initialFormData); setExpenseImageFiles([]);
        } finally {
            setIsSubmitting(false);
        }
    });

    const updateExpense = (id: number) => handleActionAndRefetch(async () => {
        if (!currentExpense || !validateFormData()) return;
        setIsSubmitting(true);
        try {
            const formPayload = new FormData();
            formPayload.append("object", formData.object);
            formPayload.append("supplier", formData.supplier);
            formPayload.append("amount", formData.amount);
            formPayload.append("expense_type", formData.expense_type);
            formPayload.append("date", formData.date);
            formPayload.append("comment", formData.comment.trim());
            formPayload.append("status", formData.status === "Naqd pul" ? "To'langan" : "Kutilmoqda");
            if (expenseImageFiles.length > 0) {
                formPayload.append("image", expenseImageFiles[0], expenseImageFiles[0].name || "image.jpg");
            }
            const headers: HeadersInit = { Authorization: `Bearer ${accessToken}` };
            const res = await fetch(`${API_BASE_URL}/expenses/${id}/`, { method: "PATCH", headers, body: formPayload });
            if (res.status === 401) { clearAuthAndRedirect(router); return; }
            if (!res.ok) {
                const errBody = await res.json().catch(() => ({}));
                const msg = errBody && typeof errBody === "object"
                    ? (Array.isArray(errBody)
                        ? errBody.join(", ")
                        : Object.entries(errBody)
                            .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : String(v)}`)
                            .join("; "))
                    : res.statusText;
                throw new Error(msg || "Xarajat yangilanmadi");
            }
            await res.json();
            toast.success("Xarajat muvaffaqiyatli yangilandi");

            const updatedTotals = await fetchExpensesAndTotals();
            const dataToSend = { object: Number(formData.object), supplier: Number(formData.supplier), amount: formData.amount, expense_type: Number(formData.expense_type), date: formData.date, comment: formData.comment.trim(), status: formData.status };

            const changes = [];
            if (currentExpense.object !== dataToSend.object) changes.push(`• <b>Obyekt:</b> <code>${getObjectName(currentExpense.object)}</code> → <code>${getObjectName(dataToSend.object)}</code>`);
            if (currentExpense.supplier !== dataToSend.supplier) changes.push(`• <b>Yetkazib beruvchi:</b> <code>${currentExpense.supplier_name}</code> → <code>${suppliers.find(s => s.id === dataToSend.supplier)?.company_name}</code>`);
            if (currentExpense.amount !== dataToSend.amount) changes.push(`• <b>Summa:</b> <code>${formatCurrency(currentExpense.amount)}</code> → <code>${formatCurrency(dataToSend.amount)}</code>`);
            if (currentExpense.date !== dataToSend.date) changes.push(`• <b>Sana:</b> <code>${formatDate(currentExpense.date)}</code> → <code>${formatDate(dataToSend.date)}</code>`);
            if (currentExpense.comment !== dataToSend.comment) changes.push(`• <b>Izoh:</b> <code>${currentExpense.comment}</code> → <code>${dataToSend.comment}</code>`);
            const oldStatus = currentExpense.status === "To'langan" ? "Naqd pul" : "Nasiya";
            if (oldStatus !== formData.status) changes.push(`• <b>Holat:</b> <code>${oldStatus}</code> → <code>${formData.status}</code>`);

            if (changes.length > 0) {
                let message = `<b>✏️ Xarajat Tahrirlandi (ID: ${id})</b>\n\n` +
                    `<b>Kim tomonidan:</b> ${currentUser?.fio || "Noma'lum"}\n\n` +
                    `<b>O'zgarishlar:</b>\n` + changes.join("\n");
                message += `\n\n➖➖➖➖➖\n` +
                    `<b>📊 Umumiy Holat:</b>\n` +
                    `<b>Jami Xarajat:</b> ${formatCurrency(updatedTotals.totalAmount)}\n` +
                    `<b>To'langan:</b> ${formatCurrency(updatedTotals.paidAmount)}\n` +
                    `<b>Nasiya qoldiq:</b> ${formatCurrency(updatedTotals.pendingDebt)}`;
                await sendTelegramNotification(message, getAuthHeaders);
            }

            for (let i = 0; i < expenseImageFiles.length; i++) {
                await sendImageToTelegram(expenseImageFiles[i], `Tahrirlangan xarajat (ID: ${id}) uchun yangi rasm (${i + 1}/${expenseImageFiles.length})`);
            }
            setEditOpen(false); setCurrentExpense(null); setExpenseImageFiles([]);
        } finally {
            setIsSubmitting(false);
        }
    });

    const handleConfirmDelete = () => handleActionAndRefetch(async () => {
        if (!expenseToDelete) return;
        if (deleteCode !== "0007") return toast.error("O'chirish kodi noto'g'ri.");
        const expenseData = expenses.find(exp => exp.id === expenseToDelete);
        const delRes = await fetch(`${API_BASE_URL}/expenses/${expenseToDelete}/`, { method: "DELETE", headers: getAuthHeaders() });
        if (delRes.status === 401) { clearAuthAndRedirect(router); return; }
        const updatedTotals = await fetchExpensesAndTotals();
        
        if(expenseData){
            let message = `<b>❌ Xarajat O'chirildi</b>\n\n`+
                            `<b>Kim tomonidan:</b> ${currentUser?.fio || 'Noma`lum'}\n`+
                            `<b>Xarajat ID:</b> ${expenseToDelete}\n\n`+
                            `<b>Obyekt:</b> ${expenseData.object_name || getObjectName(expenseData.object)}\n`+
                            `<b>Yetkazib beruvchi:</b> ${expenseData.supplier_name}\n`+
                            `<b>Summa:</b> ${formatCurrency(expenseData.amount)}\n`+
                            `<b>Sana:</b> ${formatDate(expenseData.date)}`;

            message += `\n\n➖➖➖➖➖\n` +
                       `<b>📊 Umumiy Holat:</b>\n` +
                       `<b>Jami Xarajat:</b> ${formatCurrency(updatedTotals.totalAmount)}\n` +
                       `<b>To'langan:</b> ${formatCurrency(updatedTotals.paidAmount)}\n` +
                       `<b>Nasiya qoldiq:</b> ${formatCurrency(updatedTotals.pendingDebt)}`;
            
            await sendTelegramNotification(message, getAuthHeaders);
        }

        toast.success("Xarajat o'chirildi");
        setDeleteDialogOpen(false); setExpenseToDelete(null); setDeleteCode("");
    });
    
    const openEditDialog = async (id: number) => {
        try {
            const res = await fetch(`${API_BASE_URL}/expenses/${id}/`, { headers: getAuthHeaders() });
            if(!res.ok) throw new Error("Ma'lumot topilmadi");
            const data = await res.json();
            setCurrentExpense(data);
            const { originalComment } = parsePaidAmountFromComment(data.comment);
            setFormData({ object: data.object?.toString() || "", supplier: data.supplier?.toString() || "", amount: data.amount || "0", expense_type: data.expense_type?.toString() || "", date: data.date ? format(new Date(data.date), "yyyy-MM-dd") : '', comment: originalComment, status: data.status === "To‘langan" ? "Naqd pul" : "Nasiya", });
            setExpenseImageFiles([]);
            setEditOpen(true);
        } catch (error: any) {
            toast.error(`Xarajat ma'lumotlarini yuklashda xato: ${error.message}`);
        }
    };
    
    const createItem = (url: string, data: any, stateSetter: React.Dispatch<React.SetStateAction<any[]>>, sortFn: (a: any, b: any) => number, successMsg: string, submittingsetter: React.Dispatch<React.SetStateAction<boolean>>, itemType: 'supplier' | 'expense_type', closeFn?: () => void, resetFn?: () => void) => {
        submittingsetter(true);
        fetch(url, { method: "POST", headers: getAuthHeaders(), body: JSON.stringify(data) })
            .then(res => { if (!res.ok) throw new Error("Qo'shishda xatolik"); return res.json(); })
            .then(newItem => {
                stateSetter(prev => [...prev, newItem].sort(sortFn));
                toast.success(successMsg);
                let message = '';
                if(itemType === 'supplier'){
                    message = `<b>➕ Yangi Yetkazib Beruvchi Qo'shildi</b>\n\n`+
                              `<b>Kim tomonidan:</b> ${currentUser?.fio || 'Noma`lum'}\n` +
                              `<b>Nomi:</b> ${data.company_name}`;
                } else if(itemType === 'expense_type'){
                    message = `<b>➕ Yangi Xarajat Turi Qo'shildi</b>\n\n`+
                              `<b>Kim tomonidan:</b> ${currentUser?.fio || 'Noma`lum'}\n`+
                              `<b>Nomi:</b> ${data.name}`;
                }
                if(message) sendTelegramNotification(message, getAuthHeaders);
                if (closeFn) closeFn();
                if (resetFn) resetFn();
            })
            .catch(err => toast.error(err.message))
            .finally(() => submittingsetter(false));
    };

    const createSupplier = () => {
        if (!newSupplierData.company_name.trim()) return toast.error("Kompaniya nomi kiritilishi shart");
        createItem(`${API_BASE_URL}/suppliers/`, newSupplierData, setSuppliers, (a, b) => a.company_name.localeCompare(b.company_name), `"${newSupplierData.company_name}" qo'shildi`, setIsSupplierSubmitting, 'supplier', () => setAddSupplierOpen(false), () => setNewSupplierData(initialNewSupplierData));
    };
    
    const createExpenseType = () => {
        if (!newExpenseTypeName.trim()) return toast.error("Xarajat turi nomi kiritilishi shart");
        createItem(`${API_BASE_URL}/expense-types/`, { name: newExpenseTypeName.trim() }, setExpenseTypes, (a, b) => a.name.localeCompare(b.name), `"${newExpenseTypeName}" qo'shildi`, setIsExpenseTypeSubmitting, 'expense_type', () => setAddExpenseTypeOpen(false), () => setNewExpenseTypeName(""));
    };
    
    const handleNasiyaCardClick = useCallback(() => {
        const pendingExpenses = expenses.filter(exp => exp.status !== 'To‘langan');
        if (pendingExpenses.length === 0) { toast("To'lanmagan nasiya xarajatlar mavjud emas."); return; }
        const grouped = pendingExpenses.reduce((acc, expense) => {
            const supplierId = expense.supplier;
            if (!acc[supplierId]) acc[supplierId] = { supplier: supplierId, supplier_name: expense.supplier_name, total_debt: 0, expenses: [] };
            
            const amount = parseFloat(expense.amount);
            const { paidAmount, originalComment } = parsePaidAmountFromComment(expense.comment);
            const remainingDebt = amount - paidAmount;
            
            if (remainingDebt > 0.01) {
                acc[supplierId].total_debt += remainingDebt;
                acc[supplierId].expenses.push({ 
                    ...expense, 
                    calculated_remaining_debt: remainingDebt, 
                    paid_from_comment: paidAmount,
                    original_comment: originalComment
                });
            }
            return acc;
        }, {} as Record<string, SupplierDebtGroup>);

        const finalData = Object.values(grouped).filter(group => group.total_debt > 0.01);
        finalData.forEach(group => group.expenses.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()));
        finalData.sort((a, b) => b.total_debt - a.total_debt);
        setNasiyaData(finalData); setIsNasiyaDialogOpen(true);
    }, [expenses]);
    
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    const handleSelectChange = (name: string, value: string) => setFormData(prev => ({ ...prev, [name]: value }));
    const handleFilterChange = (name: string, value: string) => setFilters(prev => ({ ...prev, [name]: value === "all" ? "" : value }));
    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value);
    const handleSupplierChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setNewSupplierData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => { 
        if (e.target.files && e.target.files.length > 0) {
            // Convert FileList to array and add to existing images
            const filesArray = Array.from(e.target.files);
            setExpenseImageFiles(prevFiles => [...prevFiles, ...filesArray]);
        }
    };
    const getExpenseTypeStyle = (typeName?: string) => {
        const lower = (typeName || '').toLowerCase();
        if (lower.includes("qurilish") || lower.includes("material")) return "bg-blue-100 text-blue-800";
        if (lower.includes("ishchi") || lower.includes("usta")) return "bg-green-100 text-green-800";
        if (lower.includes("kommunal")) return "bg-yellow-100 text-yellow-800";
        return "bg-secondary text-secondary-foreground";
    };
    
    const canPerformSensitiveActions = (user: CurrentUser | null) => user?.user_type === 'admin';

    if (!isClient) return <div className="flex h-screen w-full items-center justify-center"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>;
    
    const getExpenseImageUrl = (imageUrl: string | null | undefined): string | null => {
        if (!imageUrl) return null;
        if (imageUrl.startsWith("http")) return imageUrl;
        const base = getApiRoot();
        const path = imageUrl.startsWith("/") ? imageUrl : `/media/${imageUrl}`;
        return `${base}${path}`;
    };

    const handleImagePreview = (expenseId: number) => {
        const expense = expenses.find(exp => exp.id === expenseId);
        const url = getExpenseImageUrl(expense?.image ?? null);
        if (url) {
            setPreviewImageUrl(url);
            setImagePreviewOpen(true);
        }
    };

    const handleImageGalleryOpen = (expenseId: number) => {
        const expense = expenses.find(exp => exp.id === expenseId);
        const url = getExpenseImageUrl(expense?.image ?? null);
        if (url) {
            setGalleryImages([url]);
            setCurrentGalleryImageIndex(0);
            setImageGalleryOpen(true);
        } else {
            handleImagePreview(expenseId);
        }
    };
    
    return (
        <div className="flex w-full flex-col">
            <Toaster position="top-center" toastOptions={{ duration: 4000 }} />
            <main className="flex-1 space-y-4">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between space-y-2 md:space-y-0">
                    <h2 className="text-3xl font-bold tracking-tight">Xarajatlar</h2>
                    <div className="flex items-center space-x-2">
                        <Dialog open={open} onOpenChange={(isOpen) => { setOpen(isOpen); if (!isOpen) { setFormData(initialFormData); setExpenseImageFiles([]); } }}>
                            <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" />Xarajat qo'shish</Button></DialogTrigger>
                            <DialogContent className="sm:max-w-3xl">
                                <DialogHeader><DialogTitle>Yangi xarajat qo'shish</DialogTitle><DialogDescription>Barcha * belgili maydonlar majburiy.</DialogDescription></DialogHeader>
                                <form id="add-expense-form" onSubmit={(e) => { e.preventDefault(); createExpense(); }} className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-4">
                                    <div className="space-y-1"><Label htmlFor="amount">Summa (USD) *</Label><Input required id="amount" name="amount" type="number" placeholder="0.00" value={formData.amount} onChange={handleChange} /></div>
                                    <div className="space-y-1"><Label htmlFor="date">Sana *</Label><Input required id="date" name="date" type="date" value={formData.date} onChange={handleChange} /></div>
                                    <div className="space-y-1"><Label htmlFor="supplier">Yetkazib beruvchi *</Label>
                                        <div className="flex items-center space-x-2">
                                            <Select required value={formData.supplier} onValueChange={(v) => handleSelectChange("supplier", v)} name="supplier"><SelectTrigger><SelectValue placeholder="Tanlang..." /></SelectTrigger><SelectContent>{suppliers.map(s => <SelectItem key={s.id} value={s.id.toString()}>{s.company_name}</SelectItem>)}</SelectContent></Select>
                                            <Dialog open={addSupplierOpen} onOpenChange={setAddSupplierOpen}><DialogTrigger asChild><Button type="button" variant="outline" size="icon"><Plus className="h-4 w-4" /></Button></DialogTrigger>
                                                <DialogContent className="sm:max-w-[425px]"><DialogHeader><DialogTitle>Yangi yetkazib beruvchi</DialogTitle></DialogHeader><div className="grid gap-4 py-4"><Input name="company_name" placeholder="Kompaniya nomi *" value={newSupplierData.company_name} onChange={handleSupplierChange} /><Input name="contact_person_name" placeholder="Kontakt" value={newSupplierData.contact_person_name} onChange={handleSupplierChange} /><Input name="phone_number" placeholder="Telefon" value={newSupplierData.phone_number} onChange={handleSupplierChange} /><Textarea name="address" placeholder="Manzil" value={newSupplierData.address} onChange={handleSupplierChange} /></div><DialogFooter><Button onClick={createSupplier} disabled={isSupplierSubmitting}>{isSupplierSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Qo'shish</Button></DialogFooter></DialogContent></Dialog>
                                        </div>
                                    </div>
                                    <div className="space-y-1"><Label htmlFor="expense_type">Xarajat turi *</Label>
                                        <div className="flex items-center space-x-2">
                                            <Select required value={formData.expense_type} onValueChange={(v) => handleSelectChange("expense_type", v)} name="expense_type"><SelectTrigger><SelectValue placeholder="Tanlang..." /></SelectTrigger><SelectContent>{expenseTypes.map(t => <SelectItem key={t.id} value={t.id.toString()}>{t.name}</SelectItem>)}</SelectContent></Select>
                                            <Dialog open={addExpenseTypeOpen} onOpenChange={setAddExpenseTypeOpen}><DialogTrigger asChild><Button type="button" variant="outline" size="icon"><Plus className="h-4 w-4" /></Button></DialogTrigger>
                                                <DialogContent className="sm:max-w-[425px]"><DialogHeader><DialogTitle>Yangi xarajat turi</DialogTitle></DialogHeader><div className="grid gap-4 py-4"><Input placeholder="Nomi *" value={newExpenseTypeName} onChange={(e) => setNewExpenseTypeName(e.target.value)} /></div><DialogFooter><Button onClick={createExpenseType} disabled={isExpenseTypeSubmitting}>{isExpenseTypeSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Qo'shish</Button></DialogFooter></DialogContent></Dialog>
                                        </div>
                                    </div>
                                    <div className="space-y-1"><Label htmlFor="object">Obyekt *</Label><Select required value={formData.object} onValueChange={(v) => handleSelectChange("object", v)} name="object"><SelectTrigger><SelectValue placeholder="Tanlang..." /></SelectTrigger><SelectContent>{properties.map(p => <SelectItem key={p.id} value={p.id.toString()}>{p.name}</SelectItem>)}</SelectContent></Select></div>
                                    <div className="space-y-1"><Label htmlFor="status">To'lov turi *</Label><Select required value={formData.status} onValueChange={(v) => handleSelectChange("status", v)} name="status"><SelectTrigger><SelectValue placeholder="Tanlang..." /></SelectTrigger><SelectContent><SelectItem value="Naqd pul">Naqd pul</SelectItem><SelectItem value="Nasiya">Nasiya</SelectItem></SelectContent></Select></div>
                                    <div className="space-y-1 sm:col-span-2"><Label htmlFor="comment">Izoh *</Label><Textarea required id="comment" name="comment" value={formData.comment} onChange={handleChange} /></div>
                                    <div className="space-y-1 sm:col-span-2">
                                      <Label htmlFor="image">Rasmlar (ixtiyoriy)</Label>
                                      <Input id="image" type="file" accept="image/*" onChange={handleImageChange} multiple />
                                      {expenseImageFiles.length > 0 && (
                                        <div className="mt-2">
                                          <div className="flex justify-between items-center mb-2">
                                            <span className="text-sm font-medium">Tanlangan rasmlar: {expenseImageFiles.length} ta</span>
                                            <Button 
                                              type="button" 
                                              variant="outline" 
                                              size="sm" 
                                              onClick={() => setExpenseImageFiles([])}
                                            >
                                              Barchasini o'chirish
                                            </Button>
                                          </div>
                                          <div className="grid grid-cols-3 gap-2 max-h-40 overflow-y-auto">
                                            {expenseImageFiles.map((file, index) => (
                                              <div key={index} className="relative group">
                                                <img 
                                                  src={URL.createObjectURL(file)} 
                                                  alt={`Preview ${index + 1}`} 
                                                  className="w-full h-20 object-cover rounded border"
                                                />
                                                <Button
                                                  type="button"
                                                  variant="destructive"
                                                  size="icon"
                                                  className="absolute -top-2 -right-2 w-6 h-6 opacity-0 group-hover:opacity-100 transition-opacity"
                                                  onClick={() => {
                                                    setExpenseImageFiles(prev => prev.filter((_, i) => i !== index));
                                                  }}
                                                >
                                                  <Trash2 className="h-3 w-3" />
                                                </Button>
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                </form>
                                <DialogFooter>
                                    <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isSubmitting}>Bekor qilish</Button>
                                    <Button type="submit" form="add-expense-form" disabled={isSubmitting}>{isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Saqlash</Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    <div className="space-y-1"><Label htmlFor="filter-object">Obyekt</Label><Select value={filters.object} onValueChange={(v) => handleFilterChange("object", v)}><SelectTrigger><SelectValue placeholder="Barcha obyektlar" /></SelectTrigger><SelectContent><SelectItem value="all">Barcha</SelectItem>{properties.map(p => <SelectItem key={p.id} value={p.id.toString()}>{p.name}</SelectItem>)}</SelectContent></Select></div>
                    <div className="space-y-1"><Label htmlFor="filter-expense_type">Xarajat turi</Label><Select value={filters.expense_type} onValueChange={(v) => handleFilterChange("expense_type", v)}><SelectTrigger><SelectValue placeholder="Barcha turlar" /></SelectTrigger><SelectContent><SelectItem value="all">Barcha</SelectItem>{expenseTypes.map(t => <SelectItem key={t.id} value={t.id.toString()}>{t.name}</SelectItem>)}</SelectContent></Select></div>
                    <div className="space-y-1"><Label htmlFor="filter-dateRange">Sana</Label><Select value={filters.dateRange} onValueChange={(v) => handleFilterChange("dateRange", v)}><SelectTrigger><SelectValue placeholder="Barcha sanalar" /></SelectTrigger><SelectContent><SelectItem value="all">Barcha</SelectItem><SelectItem value="today">Bugun</SelectItem><SelectItem value="week">Hafta</SelectItem><SelectItem value="month">Oy</SelectItem><SelectItem value="quarter">Chorak</SelectItem><SelectItem value="year">Yil</SelectItem></SelectContent></Select></div>
                    <div className="space-y-1"><Label htmlFor="search">Qidiruv</Label><Input id="search" placeholder="Yetkazib beruvchi, izoh..." value={searchTerm} onChange={handleSearchChange} /></div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Umumiy xarajatlar</CardTitle><DollarSign className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent>{loadingTotals ? <Loader2 className="h-6 w-6 animate-spin" /> : <div className="text-2xl font-bold">{formatCurrency(filteredTotalAmount)}</div>}</CardContent></Card>
                    <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">To'langan</CardTitle><HandCoins className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent>{loadingTotals ? <Loader2 className="h-6 w-6 animate-spin" /> : <div className="text-2xl font-bold">{formatCurrency(filteredPaidExpensesAmount)}</div>}</CardContent></Card>
                    <div className="cursor-pointer" onClick={handleNasiyaCardClick}><Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Nasiya</CardTitle><HandCoins className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent>{loadingTotals ? <Loader2 className="h-6 w-6 animate-spin" /> : <div className="text-2xl font-bold">{formatCurrency(filteredPendingAmount)}</div>}</CardContent></Card></div>
                    <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Tanlangan Obyekt</CardTitle><Building className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent>{loadingTotals ? <Loader2 className="h-6 w-6 animate-spin" /> : <div className="text-2xl font-bold">{selectedObjectTotal !== null ? formatCurrency(selectedObjectTotal) : "-"}</div>}</CardContent></Card>
                </div>
                
                <div className="rounded-md border bg-card">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[50px]">T/r</TableHead>
                                <TableHead className="w-[120px] cursor-pointer" onClick={() => handleSort('date')}>Sana {tableSortKey === 'date' && <ArrowUpDown className="ml-2 h-4 w-4 inline-block opacity-50" />}</TableHead>
                                <TableHead className="cursor-pointer" onClick={() => handleSort('object')}>Obyekt {tableSortKey === 'object' && <ArrowUpDown className="ml-2 h-4 w-4 inline-block opacity-50" />}</TableHead>
                                <TableHead className="cursor-pointer" onClick={() => handleSort('supplier_name')}>Yetkazib beruvchi {tableSortKey === 'supplier_name' && <ArrowUpDown className="ml-2 h-4 w-4 inline-block opacity-50" />}</TableHead>
                                <TableHead>Izoh</TableHead>
                                <TableHead className="cursor-pointer" onClick={() => handleSort('expense_type_name')}>Turi {tableSortKey === 'expense_type_name' && <ArrowUpDown className="ml-2 h-4 w-4 inline-block opacity-50" />}</TableHead>
                                <TableHead className="cursor-pointer" onClick={() => handleSort('status')}>Holat {tableSortKey === 'status' && <ArrowUpDown className="ml-2 h-4 w-4 inline-block opacity-50" />}</TableHead>
                                <TableHead className="cursor-pointer text-right" onClick={() => handleSort('amount')}>Summa {tableSortKey === 'amount' && <ArrowUpDown className="ml-2 h-4 w-4 inline-block opacity-50" />}</TableHead>
                                <TableHead>Rasm</TableHead>
                                {canPerformSensitiveActions(currentUser) && <TableHead className="text-right">Amallar</TableHead>}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? <TableRow><TableCell colSpan={10} className="h-24 text-center"><Loader2 className="h-8 w-8 animate-spin mx-auto" /></TableCell></TableRow>
                            : sortedExpenses.length > 0 ? sortedExpenses.map((expense, index) => {
                                const { originalComment } = parsePaidAmountFromComment(expense.comment);
                                return (
                                <TableRow key={expense.id}>
                                    <TableCell className="font-medium">{index + 1}</TableCell>
                                    <TableCell>{formatDate(expense.date)}</TableCell>
                                    <TableCell>{getObjectName(expense.object)}</TableCell>
                                    <TableCell>{expense.supplier_name}</TableCell>
                                    <TableCell className="max-w-[200px] truncate" title={originalComment}>{originalComment}</TableCell>
                                    <TableCell><Badge variant="outline" className={getExpenseTypeStyle(expense.expense_type_name)}>{expense.expense_type_name}</Badge></TableCell>
                                    <TableCell><Badge variant={expense.status === "To‘langan" ? "default" : "secondary"}>{expense.status}</Badge></TableCell>
                                    <TableCell className="text-right font-semibold">{formatCurrency(expense.amount)}</TableCell>
                                    <TableCell>
                                        {expense.image ? (
                                            <Button 
                                                variant="outline" 
                                                size="sm" 
                                                onClick={() => handleImageGalleryOpen(expense.id)}
                                                className="flex items-center gap-1"
                                            >
                                                <Camera className="h-4 w-4" />
                                                Rasm
                                            </Button>
                                        ) : (
                                            <span className="text-muted-foreground text-sm">-</span>
                                        )}
                                    </TableCell>
                                    {canPerformSensitiveActions(currentUser) && (
                                        <TableCell className="text-right">
                                            <Button variant="ghost" size="icon" onClick={() => openEditDialog(expense.id)}><Pencil className="h-4 w-4" /></Button>
                                            <Button variant="ghost" size="icon" onClick={() => { setExpenseToDelete(expense.id); setDeleteDialogOpen(true); }}><Trash className="h-4 w-4 text-red-500" /></Button>
                                        </TableCell>
                                    )}
                                </TableRow>
                            )})
                            : <TableRow><TableCell colSpan={10} className="h-24 text-center">Filtrlarga mos xarajatlar topilmadi.</TableCell></TableRow>}
                        </TableBody>
                    </Table>
                </div>
            </main>

            <Dialog open={editOpen} onOpenChange={(isOpen) => { setEditOpen(isOpen); if (!isOpen) { setCurrentExpense(null); setExpenseImageFiles([]); } }}>
                <DialogContent className="sm:max-w-3xl"><DialogHeader><DialogTitle>Xarajatni tahrirlash (ID: {currentExpense?.id})</DialogTitle></DialogHeader>
                    <form id="edit-expense-form" onSubmit={(e) => { e.preventDefault(); if (currentExpense) updateExpense(currentExpense.id); }} className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-4">
                        <div className="space-y-1"><Label htmlFor="edit-amount">Summa (USD) *</Label><Input required id="edit-amount" name="amount" type="number" value={formData.amount} onChange={handleChange} /></div>
                        <div className="space-y-1"><Label htmlFor="edit-date">Sana *</Label><Input required id="edit-date" name="date" type="date" value={formData.date} onChange={handleChange} /></div>
                        <div className="space-y-1"><Label htmlFor="edit-supplier">Yetkazib beruvchi *</Label><Select required value={formData.supplier} onValueChange={v => handleSelectChange("supplier", v)} name="supplier"><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{suppliers.map(s => <SelectItem key={s.id} value={s.id.toString()}>{s.company_name}</SelectItem>)}</SelectContent></Select></div>
                        <div className="space-y-1"><Label htmlFor="edit-expense_type">Xarajat turi *</Label><Select required value={formData.expense_type} onValueChange={v => handleSelectChange("expense_type", v)} name="expense_type"><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{expenseTypes.map(t => <SelectItem key={t.id} value={t.id.toString()}>{t.name}</SelectItem>)}</SelectContent></Select></div>
                        <div className="space-y-1"><Label htmlFor="edit-object">Obyekt *</Label><Select required value={formData.object} onValueChange={v => handleSelectChange("object", v)} name="object"><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{properties.map(p => <SelectItem key={p.id} value={p.id.toString()}>{p.name}</SelectItem>)}</SelectContent></Select></div>
                        <div className="space-y-1"><Label htmlFor="edit-status">To'lov turi *</Label><Select required value={formData.status} onValueChange={v => handleSelectChange("status", v)} name="status"><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Naqd pul">Naqd pul</SelectItem><SelectItem value="Nasiya">Nasiya</SelectItem></SelectContent></Select></div>
                        <div className="space-y-1 sm:col-span-2"><Label htmlFor="edit-comment">Izoh *</Label><Textarea required id="edit-comment" name="comment" value={formData.comment} onChange={handleChange} /></div>
                        <div className="space-y-1 sm:col-span-2">
                      <Label htmlFor="edit-image">Yangi rasmlar (avvalgisi o'chiriladi)</Label>
                      <Input id="edit-image" type="file" accept="image/*" onChange={handleImageChange} multiple />
                      {expenseImageFiles.length > 0 && (
                        <div className="mt-2">
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-sm font-medium">Tanlangan rasmlar: {expenseImageFiles.length} ta</span>
                            <Button 
                              type="button" 
                              variant="outline" 
                              size="sm" 
                              onClick={() => setExpenseImageFiles([])}
                            >
                              Barchasini o'chirish
                            </Button>
                          </div>
                          <div className="grid grid-cols-3 gap-2 max-h-40 overflow-y-auto">
                            {expenseImageFiles.map((file, index) => (
                              <div key={index} className="relative group">
                                <img 
                                  src={URL.createObjectURL(file)} 
                                  alt={`Preview ${index + 1}`} 
                                  className="w-full h-20 object-cover rounded border"
                                />
                                <Button
                                  type="button"
                                  variant="destructive"
                                  size="icon"
                                  className="absolute -top-2 -right-2 w-6 h-6 opacity-0 group-hover:opacity-100 transition-opacity"
                                  onClick={() => {
                                    setExpenseImageFiles(prev => prev.filter((_, i) => i !== index));
                                  }}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    </form>
                    <DialogFooter><Button type="button" variant="outline" onClick={() => setEditOpen(false)} disabled={isSubmitting}>Bekor qilish</Button><Button type="submit" form="edit-expense-form" disabled={isSubmitting}>{isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Yangilash</Button></DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <DialogContent><DialogHeader><DialogTitle>O'chirishni tasdiqlang</DialogTitle><DialogDescription>Ushbu amalni orqaga qaytarib bo'lmaydi. Xarajatni butunlay o'chirish uchun kodini kiriting.</DialogDescription></DialogHeader>
                    <div className="py-4"><Label htmlFor="delete-code">O'chirish kodi</Label><Input id="delete-code" value={deleteCode} onChange={(e) => setDeleteCode(e.target.value)} placeholder="Kodni kiriting" /></div>
                    <DialogFooter><Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Bekor qilish</Button><Button variant="destructive" onClick={handleConfirmDelete} disabled={deleteCode !== '0007'}><Trash2 className="mr-2 h-4 w-4" /> O'chirish</Button></DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={isNasiyaDialogOpen} onOpenChange={setIsNasiyaDialogOpen}>
                <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col">
                    <DialogHeader><DialogTitle>Nasiya Xarajatlar Ro'yxati</DialogTitle><DialogDescription>Yetkazib beruvchilar bo'yicha guruhlangan to'lanmagan xarajatlar.</DialogDescription></DialogHeader>
                    <div className="flex-grow overflow-y-auto pr-4 -mr-2">
                        {nasiyaData.length > 0 ? (
                            <Accordion type="single" collapsible className="w-full">
                                {nasiyaData.map(group => (
                                    <AccordionItem value={String(group.supplier)} key={group.supplier}>
                                        <AccordionTrigger>
                                            <div className="flex justify-between items-center w-full pr-4">
                                                <span className="font-semibold text-left">{group.supplier_name}</span>
                                                <Badge variant="destructive">{formatCurrency(group.total_debt)}</Badge>
                                            </div>
                                        </AccordionTrigger>
                                        <AccordionContent>
                                            <div className="px-1">
                                                <Table>
                                                    <TableHeader><TableRow><TableHead>Sana</TableHead><TableHead>Izoh</TableHead><TableHead className="text-right">Umumiy</TableHead><TableHead className="text-right">To'langan</TableHead><TableHead className="text-right font-bold">Qoldiq</TableHead></TableRow></TableHeader>
                                                    <TableBody>
                                                        {group.expenses.map(exp => (
                                                            <TableRow key={exp.id}>
                                                                <TableCell>{formatDate(exp.date)}</TableCell>
                                                                <TableCell className="max-w-[250px] truncate" title={exp.original_comment}>{exp.original_comment}</TableCell>
                                                                <TableCell className="text-right">{formatCurrency(exp.amount)}</TableCell>
                                                                <TableCell className="text-right text-green-600">{formatCurrency(exp.paid_from_comment)}</TableCell>
                                                                <TableCell className="text-right font-bold">{formatCurrency(exp.calculated_remaining_debt)}</TableCell>
                                                            </TableRow>
                                                        ))}
                                                    </TableBody>
                                                </Table>
                                                <div className="flex justify-end mt-4">
                                                    <Button onClick={() => { setCurrentPaymentSupplier(group); setIsPaymentDialogOpen(true); }}>To'lov qilish</Button>
                                                </div>
                                            </div>
                                        </AccordionContent>
                                    </AccordionItem>
                                ))}
                            </Accordion>
                        ) : (<div className="text-center text-muted-foreground py-10">To'lanmagan xarajatlar topilmadi.</div>)}
                    </div>
                    <DialogFooter><Button variant="outline" onClick={() => setIsNasiyaDialogOpen(false)}>Yopish</Button></DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>To'lov: {currentPaymentSupplier?.supplier_name}</DialogTitle>
                        <DialogDescription>Joriy qarz: <span className="font-bold text-red-600">{formatCurrency(currentPaymentSupplier?.total_debt)}</span>. To'lov summasini kiriting.</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="space-y-1">
                            <Label htmlFor="payment-amount">Summa (USD)</Label>
                            <Input id="payment-amount" type="number" placeholder="0.00" value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} />
                        </div>
                        <div className="space-y-1">
                            <Label htmlFor="payment-description">Tavsif</Label>
                            <Textarea id="payment-description" placeholder="To'lov uchun izoh..." value={paymentDescription} onChange={(e) => setPaymentDescription(e.target.value)} />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsPaymentDialogOpen(false)} disabled={isSubmittingPayment}>Bekor qilish</Button>
                        <Button onClick={handleAddPayment} disabled={isSubmittingPayment || !paymentAmount || Number(paymentAmount) <= 0}>
                            {isSubmittingPayment && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            To'lash
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Image Gallery Dialog */}
            <Dialog open={imageGalleryOpen} onOpenChange={setImageGalleryOpen}>
                <DialogContent className="sm:max-w-4xl">
                    <DialogHeader>
                        <DialogTitle>Xarajat rasmlari</DialogTitle>
                    </DialogHeader>
                    <div className="flex flex-col items-center py-4">
                        {galleryImages.length > 0 && (
                            <>
                                <div className="relative w-full flex justify-center items-center">
                                    <img 
                                        src={galleryImages[currentGalleryImageIndex]} 
                                        alt={`Xarajat rasmi ${currentGalleryImageIndex + 1}`} 
                                        className="max-w-full max-h-[70vh] object-contain"
                                        onError={(e) => {
                                            const target = e.target as HTMLImageElement;
                                            target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iI2NjYyIvPjx0ZXh0IHg9IjUwIiB5PSI1NSIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjEyIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjNjY2Ij5SYXNtIGxvZGl5YWxtYWRpPC90ZXh0Pjwvc3ZnPg==';
                                        }}
                                    />
                                </div>
                                <div className="flex justify-between w-full mt-4">
                                    <Button 
                                        variant="outline" 
                                        onClick={() => setCurrentGalleryImageIndex(prev => Math.max(0, prev - 1))}
                                        disabled={currentGalleryImageIndex === 0}
                                    >
                                        Oldingi
                                    </Button>
                                    <span className="self-center">{currentGalleryImageIndex + 1} / {galleryImages.length}</span>
                                    <Button 
                                        variant="outline" 
                                        onClick={() => setCurrentGalleryImageIndex(prev => Math.min(galleryImages.length - 1, prev + 1))}
                                        disabled={currentGalleryImageIndex === galleryImages.length - 1}
                                    >
                                        Keyingi
                                    </Button>
                                </div>
                                <div className="grid grid-cols-3 gap-2 mt-4 max-h-32 overflow-y-auto w-full">
                                    {galleryImages.map((img, index) => (
                                        <div 
                                            key={index} 
                                            className={`cursor-pointer border-2 rounded ${index === currentGalleryImageIndex ? 'border-blue-500' : 'border-gray-200'}`}
                                            onClick={() => setCurrentGalleryImageIndex(index)}
                                        >
                                            <img src={img} alt={`Rasm ${index + 1}`} className="w-full h-16 object-cover" />
                                        </div>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setImageGalleryOpen(false)}>Yopish</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}