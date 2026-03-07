"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import dynamic from 'next/dynamic';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Edit, Trash, Minus, BarChart3 } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SortableTableHead, type SortDirection } from "@/components/sortable-table-head";
import { sortByKey } from "@/lib/table-sort";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Toaster } from "react-hot-toast";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Building2, Home, Hammer, Wrench, HardHat, Truck, Building, Factory, Warehouse, Construction } from "lucide-react";

import { getApiBaseUrl } from "@/app/lib/api";
const API_BASE_URL = getApiBaseUrl();
const TELEGRAM_CHAT_ID = process.env.NEXT_PUBLIC_TELEGRAM_CHAT_ID || "-1003733316489";

interface UserCreate {
  fio: string;
  phone_number: string;
  address: string;
  kafil_address: string;
  balance: string;
  user_type: string;
  password: string;
}

interface User {
  id: number;
  fio: string;
  phone_number: string;
  address: string;
  kafil_address: string | null;
  balance: number;
  kafil_fio: string | null;
  kafil_phone_number: string | null;
  user_type: string;
}

interface UserUpdate {
  fio: string;
  phone_number: string;
  address: string;
  kafil_address: string;
}

interface Payment {
    id: number;
    amount: string;
    payment_type: 'naqd' | 'muddatli' | 'ipoteka';
    description: string;
    created_at: string;
}

interface CurrentUser {
  fio: string;
  user_type: 'admin' | 'sotuvchi' | 'buxgalter' | 'mijoz' | string;
}

const FloatingIcons = () => {
  const icons = [
    { Icon: Building2, size: 48 }, { Icon: Home, size: 42 }, { Icon: Hammer, size: 46 },
    { Icon: Wrench, size: 40 }, { Icon: HardHat, size: 48 }, { Icon: Truck, size: 52 },
    { Icon: Building, size: 56 }, { Icon: Factory, size: 48 }, { Icon: Warehouse, size: 46 },
    { Icon: Construction, size: 42 },
  ];
  const [isClient, setIsClient] = useState(false);
  useEffect(() => { setIsClient(true); }, []);
  if (!isClient) return null;
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
      {icons.map(({ Icon, size }, index) => {
        const duration = 12 + Math.random() * 10;
        const delay = Math.random() * 5;
        const xStart = typeof window !== 'undefined' ? Math.random() * window.innerWidth * 0.8 : 0;
        const yStart = typeof window !== 'undefined' ? Math.random() * window.innerHeight * 0.8 : 0;
        return (
          <motion.div
            key={index}
            className={`absolute drop-shadow-xl`}
            initial={{ x: xStart, y: yStart, scale: 0.8 + Math.random() * 0.6, rotate: Math.random() * 360, opacity: 0.7 + Math.random() * 0.3 }}
            animate={{ x: [xStart, xStart + 80 * Math.sin(index), xStart + 160 * Math.sin(index * 2), xStart], y: [yStart, yStart + 60 * Math.cos(index), yStart - 60 * Math.cos(index * 2), yStart], scale: [1, 1.2, 0.9, 1], rotate: [0, 360], opacity: [0.8, 1, 0.8], filter: ['blur(0.5px) brightness(1)', 'blur(1.5px) brightness(1.2)', 'blur(0.5px) brightness(1)'] }}
            transition={{ duration, delay, repeat: Infinity, ease: 'easeInOut', times: [0, 0.33, 0.66, 1] }}
            style={{ zIndex: 0 }}
          >
            <div className="rounded-full p-3"><Icon size={size} className="text-sky-500/30 drop-shadow-lg" /></div>
          </motion.div>
        );
      })}
    </div>
  );
};

const QarzdorlarPageComponent = () => {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [tableSortKey, setTableSortKey] = useState<string | null>(null);
  const [tableSortDir, setTableSortDir] = useState<SortDirection>(null);
  const [totalAmount, setTotalAmount] = useState(0);
  
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [userToEdit, setUserToEdit] = useState<User | null>(null);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [deleteCode, setDeleteCode] = useState("");

  const [paymentHistory, setPaymentHistory] = useState<Payment[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  
  const [paymentData, setPaymentData] = useState({ amount: '', payment_type: 'naqd' as 'naqd' | 'muddatli' | 'ipoteka', description: '' });
  const [addFormData, setAddFormData] = useState<Omit<UserCreate, 'password' | 'user_type'>>({ fio: "", phone_number: "", address: "", kafil_address: "", balance: "0" });
  const [editFormData, setEditFormData] = useState<UserUpdate>({ fio: "", phone_number: "", address: "", kafil_address: "" });
  
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [hasPageAccess, setHasPageAccess] = useState<boolean | null>(null);

  const getAuthHeaders = useCallback(() => ({
    Accept: "application/json",
    "Content-Type": "application/json",
    Authorization: `Bearer ${accessToken}`,
  }), [accessToken]);

  const sendTelegramNotification = useCallback(async (message: string) => {
    const headers = getAuthHeaders();
    if (!headers || !(headers as Record<string, string>)["Authorization"] || !TELEGRAM_CHAT_ID) return;
    try {
      const res = await fetch(`${API_BASE_URL}/telegram/send-message/`, {
        method: "POST",
        headers: { ...(headers as Record<string, string>), "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text: message, parse_mode: "HTML" }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { detail?: string }).detail || res.statusText);
      }
    } catch (error) {
      console.error("Telegram xabarnomasini yuborishda xatolik:", error);
    }
  }, [getAuthHeaders]);

  const canUserPerformActions = useCallback((user: CurrentUser | null): boolean => {
    if (!user) return false;
    return user.user_type?.toLowerCase() === 'admin';
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('access_token');
      if (token) {
        setAccessToken(token);
        const userType = localStorage.getItem("user_type");
        const userFio = localStorage.getItem("user_fio");
        if (userType && userFio) {
          const user = { user_type: userType as CurrentUser['user_type'], fio: userFio };
          setCurrentUser(user);
          if (user.user_type?.toLowerCase() === 'admin') {
            setHasPageAccess(true);
          } else {
            setHasPageAccess(false);
            setLoading(false);
            setUsers([]);
            toast.error("Sizda bu sahifani ko'rish uchun ruxsat yo'q.");
          }
        } else {
          setHasPageAccess(false);
          setLoading(false);
          toast.error("Foydalanuvchi ma'lumotlari topilmadi.");
          router.push('/login');
        }
      } else {
        setHasPageAccess(false);
        setLoading(false);
        toast.error("Iltimos tizimga kiring");
        router.push('/login');
      }
    }
  }, [router]);

  const fetchAllUsers = useCallback(async (page = 1, allUsers: User[] = []): Promise<User[]> => {
    if (!hasPageAccess || typeof window === 'undefined') return [];
    try {
      const token = localStorage.getItem('access_token');
      if (!token) { router.push('/login'); return []; }
      const response = await fetch(`${API_BASE_URL}/users/?limit=100&page=${page}&user_type=mijoz`, { headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' } });
      if (!response.ok) {
        if (response.status === 401) { if (typeof window !== 'undefined') localStorage.removeItem('access_token'); router.push('/login'); return []; }
        throw new Error('Network response was not ok');
      }
      const data = await response.json();
      const combinedUsers = [...allUsers, ...data.results];
      if (data.next) return fetchAllUsers(page + 1, combinedUsers);
      return combinedUsers;
    } catch (error) { return []; }
  }, [router, hasPageAccess]);

  const fetchUsers = useCallback(async () => {
    if (!hasPageAccess) { setLoading(false); return; }
    setLoading(true);
    try {
      const allUsers = await fetchAllUsers();
      const debtorUsers = allUsers.filter((user: User) => user.fio && user.fio.includes('(Qarzdor)'));
      setUsers(debtorUsers);
      const initialTotal = debtorUsers.reduce((sum, user) => sum + (Number(user.balance) || 0), 0);
      setTotalAmount(initialTotal);
    } catch (error) { toast.error("Ma'lumotlarni yuklashda xatolik yuz berdi"); } 
    finally { setLoading(false); }
  }, [fetchAllUsers, hasPageAccess]);

  useEffect(() => {
    if (accessToken && hasPageAccess === true) fetchUsers();
    else if (hasPageAccess === false) { setUsers([]); setTotalAmount(0); setLoading(false); }
  }, [accessToken, hasPageAccess, fetchUsers]);
  
  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canUserPerformActions(currentUser) || !currentUser) { toast.error("Bu amalni bajarish uchun ruxsatingiz yo'q."); return; }
    if (!accessToken) { toast.error("Iltimos tizimga kiring"); router.push('/login'); return; }
    try {
      const userPayload: UserCreate = {
        fio: `${addFormData.fio} (Qarzdor)`,
        phone_number: addFormData.phone_number,
        address: addFormData.address,
        kafil_address: addFormData.kafil_address,
        balance: addFormData.balance,
        user_type: 'mijoz',
        password: addFormData.phone_number
      };
      const response = await fetch(`${API_BASE_URL}/users/`, { method: 'POST', headers: getAuthHeaders(), body: JSON.stringify(userPayload) });
      if (!response.ok) throw new Error('Network response was not ok');
      
      const message = `<b>➕👤 Yangi Qarzdor Qo'shildi</b>\n\n`+
                      `<b>Kim tomonidan:</b> ${currentUser.fio}\n`+
                      `<b>Qarzdor F.I.O:</b> ${userPayload.fio}\n`+
                      `<b>Telefon:</b> ${userPayload.phone_number}\n`+
                      `<b>Manzil:</b> ${userPayload.address || "Kiritilmagan"}\n`+
                      `<b>Tavsif:</b> ${userPayload.kafil_address || "Kiritilmagan"}\n`+
                      `<b>Boshlang'ich qarz:</b> ${Number(userPayload.balance).toLocaleString('uz-UZ')} $`;
      await sendTelegramNotification(message);

      await fetchUsers();
      setIsAddOpen(false);
      setAddFormData({ fio: "", phone_number: "", address: "", kafil_address: "", balance: "0" });
      toast.success("Qarzdor muvaffaqiyatli qo'shildi");
    } catch (error) { toast.error("Qarzdor qo'shishda xatolik yuz berdi"); }
  };
  
  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canUserPerformActions(currentUser) || !userToEdit || !currentUser) { toast.error("Bu amalni bajarish uchun ruxsatingiz yo'q."); return; }
    if (!accessToken) { toast.error("Iltimos tizimga kiring"); router.push('/login'); return; }
    try {
      const updatedData = { 
        ...editFormData, 
        fio: `${editFormData.fio} (Qarzdor)`,
        password: editFormData.phone_number
      };
      const response = await fetch(`${API_BASE_URL}/users/${userToEdit.id}/`, { method: 'PUT', headers: getAuthHeaders(), body: JSON.stringify(updatedData) });
      if (!response.ok) throw new Error('Network response was not ok');
      
      const message = `<b>✏️👤 Qarzdor Ma'lumotlari Tahrirlandi</b>\n\n`+
                      `<b>Kim tomonidan:</b> ${currentUser.fio}\n`+
                      `<b>Qarzdor:</b> ${userToEdit.fio} (ID: ${userToEdit.id})\n\n`+
                      `<b>F.I.O:</b> <code>${userToEdit.fio.replace(" (Qarzdor)","")}</code> → <code>${editFormData.fio}</code>\n`+
                      `<b>Telefon:</b> <code>${userToEdit.phone_number}</code> → <code>${editFormData.phone_number}</code>\n`+
                      `<b>Manzil:</b> <code>${userToEdit.address}</code> → <code>${editFormData.address}</code>\n`+
                      `<b>Tavsif:</b> <code>${userToEdit.kafil_address || ''}</code> → <code>${editFormData.kafil_address}</code>`;
      await sendTelegramNotification(message);

      await fetchUsers();
      setIsEditOpen(false);
      setUserToEdit(null);
      toast.success("Qarzdor ma'lumotlari yangilandi");
    } catch (error) { toast.error("Qarzdor ma'lumotlarini yangilashda xatolik"); }
  };

  const handleConfirmDelete = async () => {
    if (!canUserPerformActions(currentUser) || !currentUser || !userToDelete) {
        toast.error("Amalni bajarishda xatolik.");
        return;
    }
    if (deleteCode !== '0007') {
        toast.error("O'chirish kodi noto'g'ri.");
        return;
    }
    if (!accessToken) {
        toast.error("Iltimos tizimga kiring");
        router.push('/login');
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/users/${userToDelete.id}/`, { method: 'DELETE', headers: getAuthHeaders() });
        if (!response.ok) throw new Error('Network response was not ok');
        
        const message = `<b>❌👤 Qarzdor O'chirildi</b>\n\n`+
                        `<b>Kim tomonidan:</b> ${currentUser.fio}\n`+
                        `<b>O'chirilgan qarzdor:</b> ${userToDelete.fio}\n`+
                        `<b>O'chirish vaqtidagi balansi:</b> ${userToDelete.balance.toLocaleString('uz-UZ')} $`;
        await sendTelegramNotification(message);

        await fetchUsers();
        toast.success("Qarzdor o'chirildi");
    } catch (error) {
        toast.error("Qarzdorni o'chirishda xatolik yuz berdi");
    } finally {
        setIsDeleteDialogOpen(false);
        setUserToDelete(null);
        setDeleteCode("");
    }
  };

  const handleAddPayment = async (isNegative: boolean = false) => {
    if (!canUserPerformActions(currentUser) || !selectedUser || !currentUser) { toast.error("Bu amalni bajarish uchun ruxsatingiz yo'q."); return; }
    if (!accessToken) { toast.error("Iltimos tizimga kiring"); router.push('/login'); return; }
    try {
      const amount = isNegative ? (-Math.abs(Number(paymentData.amount))) : Math.abs(Number(paymentData.amount));
      const response = await fetch(`${API_BASE_URL}/user-payments/`, { method: 'POST', headers: getAuthHeaders(), body: JSON.stringify({ ...paymentData, user: selectedUser.id, amount: amount.toString() }) });
      if (!response.ok) throw new Error('Network response was not ok');
      
      const oldBalance = selectedUser.balance;
      const newBalance = oldBalance + amount;
      let message;
      if(isNegative){
          message = `<b>🔴💸 Balansdan Pul Ayirildi (Qarz qo'shildi)</b>\n\n`+
                    `<b>Kim tomonidan:</b> ${currentUser.fio}\n`+
                    `<b>Mijoz:</b> ${selectedUser.fio}\n\n`+
                    `<b>Ayirma summasi:</b> ${amount.toLocaleString('uz-UZ')} $\n`+
                    `<b>Operatsiya turi:</b> ${paymentData.payment_type}\n`+
                    `<b>Izoh:</b> ${paymentData.description || "Kiritilmagan"}\n`+
                    `<b>Eski balans:</b> ${oldBalance.toLocaleString('uz-UZ')} $\n`+
                    `<b>Yangi balans:</b> ${newBalance.toLocaleString('uz-UZ')} $`;
      } else {
          message = `<b>🟢💰 Balansga Pul Qo'shildi</b>\n\n`+
                    `<b>Kim tomonidan:</b> ${currentUser.fio}\n`+
                    `<b>Mijoz:</b> ${selectedUser.fio}\n\n`+
                    `<b>To'lov summasi:</b> +${amount.toLocaleString('uz-UZ')} $\n`+
                    `<b>To'lov turi:</b> ${paymentData.payment_type}\n`+
                    `<b>Izoh:</b> ${paymentData.description || "Kiritilmagan"}\n`+
                    `<b>Eski balans:</b> ${oldBalance.toLocaleString('uz-UZ')} $\n`+
                    `<b>Yangi balans:</b> ${newBalance.toLocaleString('uz-UZ')} $`;
      }
      await sendTelegramNotification(message);

      toast.success("To'lov muvaffaqiyatli qo'shildi");
      setIsPaymentOpen(false);
      setPaymentData({ amount: '', payment_type: 'naqd', description: '' });
      fetchUsers();
    } catch (error) { toast.error("To'lov qo'shishda xatolik yuz berdi"); }
  };

  const handleOpenHistory = async (user: User) => {
    if (!canUserPerformActions(currentUser)) { toast.error("Tarixni ko'rish uchun ruxsatingiz yo'q."); return; }
    if (!accessToken) { toast.error("Iltimos tizimga kiring"); router.push('/login'); return; }
    setSelectedUser(user);
    setHistoryLoading(true);
    setIsHistoryOpen(true);
    try {
        const response = await fetch(`${API_BASE_URL}/user-payments/?user=${user.id}`, { headers: getAuthHeaders() });
        if (!response.ok) throw new Error('Network response was not ok');
        const data = await response.json();
        const historyArray = data.results || data; 
        if (Array.isArray(historyArray)) {
            setPaymentHistory(historyArray);
        } else {
            setPaymentHistory([]);
        }
    } catch (error) {
        toast.error("To'lovlar tarixini yuklashda xatolik.");
        setIsHistoryOpen(false);
    } finally {
        setHistoryLoading(false);
    }
  };

  const openEditDialog = (user: User) => {
    setUserToEdit(user);
    setEditFormData({
        fio: user.fio.replace(" (Qarzdor)", "").trim(),
        phone_number: user.phone_number,
        address: user.address,
        kafil_address: user.kafil_address || ''
    });
    setIsEditOpen(true);
  };

  const filteredUsers = useMemo(() => users.filter(user =>
    (user.fio && user.fio.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (user.phone_number && user.phone_number.includes(searchTerm))
  ), [users, searchTerm]);

  const sortedUsers = useMemo(() => sortByKey(filteredUsers, tableSortKey, tableSortDir, (user, key) => {
    if (key === "balance") return Number(user.balance) ?? 0;
    return (user as Record<string, unknown>)[key] ?? "";
  }), [filteredUsers, tableSortKey, tableSortDir]);

  const handleTableSort = useCallback((key: string, dir: SortDirection) => {
    setTableSortKey(dir ? key : null);
    setTableSortDir(dir);
  }, []);

  useEffect(() => {
    const total = filteredUsers.reduce((sum, user) => sum + (Number(user.balance) || 0), 0);
    setTotalAmount(total);
  }, [filteredUsers]);

  if (hasPageAccess === null) {
    return <div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-600"></div></div>;
  }
  if (hasPageAccess === false) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <Card className="rounded-xl p-8 text-center border-white/40">
          <h2 className="text-2xl font-bold text-foreground mb-4">Ruxsat Yo'q</h2>
          <p className="text-muted-foreground">Sizda bu sahifani ko'rish uchun yetarli ruxsat yo'q.</p>
        </Card>
        <Toaster />
      </div>
    );
  }

  return (
    <div className="flex flex-col relative">
      <div className="flex items-center justify-between gap-4 mb-4">
        <h2 className="text-2xl font-semibold tracking-tight text-foreground">Qarzdorlar</h2>
        <span className="text-lg font-medium text-muted-foreground">Umumiy qarzdorlik: {new Intl.NumberFormat('uz-UZ').format(totalAmount)} $</span>
        {canUserPerformActions(currentUser) && (
          <Button onClick={() => setIsAddOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Qarzdor qo'shish
          </Button>
        )}
      </div>
      <main className="flex-1 space-y-4 relative">
        <div className="space-y-4">
          <Card className="border-white/40">
            <CardContent className="pt-4"><div className="flex items-center space-x-2"><Input placeholder="Qarzdor nomi yoki telefon raqami..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="text-lg font-semibold placeholder:text-muted-foreground"/></div></CardContent>
          </Card>
          {loading ? ( <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-600"></div></div> ) 
          : filteredUsers.length === 0 ? (
            <Card className="border-white/40"><CardContent className="pt-10 pb-10 text-center"><p className="text-muted-foreground">{searchTerm ? "Qidiruvga mos qarzdorlar topilmadi." : "Hozircha qarzdorlar mavjud emas."}</p></CardContent></Card>
          ) : (
            <Card className="border-white/40">
              <CardContent className="pt-4 overflow-x-auto">
                <Table>
                  <TableHeader><TableRow className="border-border/50"><SortableTableHead sortKey="fio" currentSortKey={tableSortKey} currentDir={tableSortDir} onSort={handleTableSort} className="text-slate-900 dark:text-white text-lg font-bold">F.I.O</SortableTableHead><SortableTableHead sortKey="phone_number" currentSortKey={tableSortKey} currentDir={tableSortDir} onSort={handleTableSort} className="text-slate-900 dark:text-white text-lg font-bold">Telefon</SortableTableHead><SortableTableHead sortKey="address" currentSortKey={tableSortKey} currentDir={tableSortDir} onSort={handleTableSort} className="text-slate-900 dark:text-white text-lg font-bold">Manzil</SortableTableHead><SortableTableHead sortKey="kafil_address" currentSortKey={tableSortKey} currentDir={tableSortDir} onSort={handleTableSort} className="text-slate-900 dark:text-white text-lg font-bold">Tavsif</SortableTableHead><SortableTableHead sortKey="balance" currentSortKey={tableSortKey} currentDir={tableSortDir} onSort={handleTableSort} className="text-slate-900 dark:text-white text-lg font-bold">Qarzi</SortableTableHead>{canUserPerformActions(currentUser) && <TableHead className="text-slate-900 dark:text-white text-lg font-bold text-right">Amallar</TableHead>}</TableRow></TableHeader>
                  <TableBody>
                    {sortedUsers.map((user) => (
                      <TableRow key={user.id} className="border-border/50 hover:bg-white/10 dark:hover:bg-white/5 transition-colors">
                        <TableCell className="text-slate-700 dark:text-slate-300 font-medium">{user.fio}</TableCell>
                        <TableCell className="text-slate-700 dark:text-slate-300">{user.phone_number}</TableCell>
                        <TableCell className="text-slate-700 dark:text-slate-300 max-w-xs truncate" title={user.address}>{user.address}</TableCell>
                        <TableCell className="text-slate-700 dark:text-slate-300 max-w-xs truncate" title={user.kafil_address || ''}>{user.kafil_address || ''}</TableCell>
                        <TableCell className="text-slate-700 dark:text-slate-300 font-semibold">{user.balance.toLocaleString()} $</TableCell>
                        {canUserPerformActions(currentUser) && (
                            <TableCell className="text-right"><div className="flex gap-2 justify-end">
                                <Button variant="ghost" size="icon" onClick={() => { setSelectedUser(user); setIsPaymentOpen(true); }} className="text-sky-500 hover:text-sky-400 hover:bg-sky-500/10" title="Balans operatsiyasi"><Plus className="h-4 w-4" /></Button>
                                <Button variant="ghost" size="icon" onClick={() => openEditDialog(user)} className="text-yellow-500 hover:text-yellow-400 hover:bg-yellow-500/10" title="Tahrirlash"><Edit className="h-4 w-4" /></Button>
                                <Button variant="ghost" size="icon" onClick={() => handleOpenHistory(user)} className="text-green-500 hover:text-green-400 hover:bg-green-500/10" title="Balans tarixi"><BarChart3 className="h-4 w-4" /></Button>
                                <Button variant="ghost" size="icon" onClick={() => { setUserToDelete(user); setIsDeleteDialogOpen(true); }} className="text-red-500 hover:text-red-400 hover:bg-red-500/10" title="O'chirish"><Trash className="h-4 w-4" /></Button>
                            </div></TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
           )}
        </div>
      </main>

      {canUserPerformActions(currentUser) && (<>
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogContent className="sm:max-w-md border-white/40">
                <DialogHeader><DialogTitle>Yangi qarzdor qo'shish</DialogTitle><DialogDescription className="text-slate-700 dark:text-slate-400">Qarzdor ma'lumotlarini kiriting</DialogDescription></DialogHeader>
                <form onSubmit={handleAddUser}>
                    <div className="grid gap-4 py-4">
                        <div className="space-y-1.5"><Label htmlFor="fio-add" >F.I.O</Label><Input id="fio-add" value={addFormData.fio} onChange={(e) => setAddFormData({ ...addFormData, fio: e.target.value })}  required/></div>
                        <div className="space-y-1.5"><Label htmlFor="phone-add" >Telefon</Label><Input id="phone-add" value={addFormData.phone_number} onChange={(e) => setAddFormData({ ...addFormData, phone_number: e.target.value })}  required/></div>
                        <div className="space-y-1.5"><Label htmlFor="address-add" >Manzil</Label><Input id="address-add" value={addFormData.address} onChange={(e) => setAddFormData({ ...addFormData, address: e.target.value })} /></div>
                        <div className="space-y-1.5"><Label htmlFor="kafil_address-add" >Tavsif</Label><Input id="kafil_address-add" value={addFormData.kafil_address} onChange={(e) => setAddFormData({ ...addFormData, kafil_address: e.target.value })} /></div>
                        <div className="space-y-1.5"><Label htmlFor="balance-add" >Qarzi ($)</Label><Input id="balance-add" type="number" value={addFormData.balance} onChange={(e) => setAddFormData({ ...addFormData, balance: e.target.value })}  required/></div>
                    </div>
                    <DialogFooter className="pt-4 border-t border-border"><Button type="button" variant="outline" onClick={()=>setIsAddOpen(false)}>Bekor qilish</Button><Button type="submit" className="bg-gradient-to-r from-sky-500 to-blue-600 text-white shadow-lg hover:shadow-xl"><Plus className="mr-2 h-4 w-4" />Qo'shish</Button></DialogFooter>
                </form>
            </DialogContent>
        </Dialog>

        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
            <DialogContent className="sm:max-w-md border-white/40">
                <DialogHeader><DialogTitle>Qarzdorni tahrirlash</DialogTitle><DialogDescription>{userToEdit?.fio} ma'lumotlarini o'zgartiring</DialogDescription></DialogHeader>
                <form onSubmit={handleUpdateUser}>
                    <div className="grid gap-4 py-4">
                        <div className="space-y-1.5"><Label htmlFor="fio-edit" >F.I.O</Label><Input id="fio-edit" value={editFormData.fio} onChange={(e) => setEditFormData({ ...editFormData, fio: e.target.value })}  required/></div>
                        <div className="space-y-1.5"><Label htmlFor="phone-edit" >Telefon</Label><Input id="phone-edit" value={editFormData.phone_number} onChange={(e) => setEditFormData({ ...editFormData, phone_number: e.target.value })}  required/></div>
                        <div className="space-y-1.5"><Label htmlFor="address-edit" >Manzil</Label><Input id="address-edit" value={editFormData.address} onChange={(e) => setEditFormData({ ...editFormData, address: e.target.value })} /></div>
                        <div className="space-y-1.5"><Label htmlFor="kafil_address-edit" >Tavsif</Label><Input id="kafil_address-edit" value={editFormData.kafil_address} onChange={(e) => setEditFormData({ ...editFormData, kafil_address: e.target.value })} /></div>
                    </div>
                    <DialogFooter className="pt-4 border-t border-border"><Button type="button" variant="outline" onClick={()=>setIsEditOpen(false)}>Bekor qilish</Button><Button type="submit" className="bg-gradient-to-r from-yellow-500 to-orange-600 text-white shadow-lg hover:shadow-xl"><Edit className="mr-2 h-4 w-4" />Saqlash</Button></DialogFooter>
                </form>
            </DialogContent>
        </Dialog>

        <Dialog open={isPaymentOpen} onOpenChange={setIsPaymentOpen}>
            <DialogContent className="sm:max-w-md border-white/40">
                <DialogHeader><DialogTitle>Balans operatsiyasi</DialogTitle><DialogDescription>{selectedUser?.fio} uchun to'lov/ayirmani kiriting</DialogDescription></DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="space-y-1.5"><Label htmlFor="amount-payment">Summa ($)</Label><Input id="amount-payment" type="number" value={paymentData.amount} onChange={(e) => setPaymentData({ ...paymentData, amount: e.target.value })} required/></div>
                    <div className="space-y-1.5"><Label htmlFor="payment_type-payment">To'lov turi</Label><Select value={paymentData.payment_type} onValueChange={(value: 'naqd' | 'muddatli' | 'ipoteka') => setPaymentData({ ...paymentData, payment_type: value })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="naqd">Naqd pul</SelectItem><SelectItem value="muddatli">Muddatli to'lov</SelectItem><SelectItem value="ipoteka">Ipoteka</SelectItem></SelectContent></Select></div>
                    <div className="space-y-1.5"><Label htmlFor="description-payment">Izoh</Label><Textarea id="description-payment" value={paymentData.description} onChange={(e) => setPaymentData({ ...paymentData, description: e.target.value })}/></div>
                </div>
                <DialogFooter className="pt-4 border-t border-border flex flex-col sm:flex-row sm:justify-end gap-2"><Button variant="outline" onClick={() => setIsPaymentOpen(false)}>Bekor qilish</Button><div className="flex gap-2"><Button type="button" onClick={() => handleAddPayment(true)} className="bg-gradient-to-r from-red-500 to-pink-600 text-white shadow-lg hover:shadow-xl"><Minus className="mr-2 h-4 w-4" />Ayirish</Button><Button type="button" onClick={() => handleAddPayment(false)} className="bg-gradient-to-r from-sky-500 to-blue-600 text-white shadow-lg hover:shadow-xl"><Plus className="mr-2 h-4 w-4" />Qo'shish</Button></div></DialogFooter>
            </DialogContent>
        </Dialog>

        <Dialog open={isHistoryOpen} onOpenChange={setIsHistoryOpen}>
            <DialogContent className="max-w-3xl border-white/40">
                <DialogHeader>
                    <DialogTitle className="text-slate-900">Balans Tarixi</DialogTitle>
                    <DialogDescription className="text-slate-500">{selectedUser?.fio} uchun operatsiyalar ro'yxati</DialogDescription>
                </DialogHeader>
                <div className="max-h-[60vh] overflow-y-auto mt-4">
                    {historyLoading ? (
                        <div className="flex items-center justify-center h-40"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900"></div></div>
                    ) : paymentHistory.length === 0 ? (
                        <p className="text-center text-slate-500 py-8">Bu foydalanuvchi uchun hali operatsiyalar mavjud emas.</p>
                    ) : (
                        <Table>
                            <TableHeader><TableRow className="border-b-slate-200"><TableHead className="text-slate-600 font-semibold">Sana</TableHead><TableHead className="text-slate-600 font-semibold">Summa</TableHead><TableHead className="text-slate-600 font-semibold">To'lov Turi</TableHead><TableHead className="text-slate-600 font-semibold">Izoh</TableHead></TableRow></TableHeader>
                            <TableBody>
                                {paymentHistory.map(payment => (
                                    <TableRow key={payment.id} className="border-b-slate-200">
                                        <TableCell className="text-slate-800">{new Date(payment.created_at).toLocaleString('uz-UZ')}</TableCell>
                                        <TableCell className={cn("font-semibold", parseFloat(payment.amount) >= 0 ? "text-green-600" : "text-red-600")}>{parseFloat(payment.amount).toLocaleString('uz-UZ')} $</TableCell>
                                        <TableCell className="text-slate-800">{payment.payment_type}</TableCell>
                                        <TableCell className="text-slate-800">{payment.description}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </div>
                <DialogFooter className="pt-4 mt-4 border-t border-slate-200"><Button variant="outline" onClick={() => setIsHistoryOpen(false)}>Yopish</Button></DialogFooter>
            </DialogContent>
        </Dialog>

        <Dialog open={isDeleteDialogOpen} onOpenChange={(isOpen) => { setIsDeleteDialogOpen(isOpen); if (!isOpen) { setUserToDelete(null); setDeleteCode(""); } }}>
            <DialogContent className="sm:max-w-md border-white/40">
                <DialogHeader>
                    <DialogTitle className="text-slate-900 dark:text-white">O'chirishni tasdiqlang</DialogTitle>
                    <DialogDescription className="text-slate-700 dark:text-slate-400">"{userToDelete?.fio}"ni butunlay o'chirish uchun kodini kiriting. Bu amalni orqaga qaytarib bo'lmaydi.</DialogDescription>
                </DialogHeader>
                <div className="py-4">
                    <Label htmlFor="delete-code" >O'chirish kodi</Label>
                    <Input id="delete-code" value={deleteCode} onChange={(e) => setDeleteCode(e.target.value)} placeholder="Kodni kiriting" className="mt-1.5"/>
                </div>
                <DialogFooter className="pt-4 border-t border-border">
                    <Button type="button" variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>Bekor qilish</Button>
                    <Button type="button" variant="destructive" onClick={handleConfirmDelete} disabled={deleteCode !== '0007'} className="bg-gradient-to-r from-red-500 to-pink-600 text-white shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"><Trash className="mr-2 h-4 w-4" /> O'chirish</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
      </>)}
      <Toaster position="top-center" toastOptions={{ duration: 3000 }} />
    </div>
  );
};

const QarzdorlarPage = dynamic(() => Promise.resolve(QarzdorlarPageComponent), { ssr: false });

export default QarzdorlarPage;