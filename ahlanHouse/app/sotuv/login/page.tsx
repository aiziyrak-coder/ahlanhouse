"use client";

import type React from "react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { toast as showToast } from "@/hooks/use-toast";
import { jwtDecode } from "jwt-decode";
import { getApiBaseUrl, getErrorMessage } from "@/app/lib/api";
import { Loader2, Building2 } from "lucide-react";

interface DecodedToken {
  token_type: string;
  exp: number;
  iat: number;
  jti: string;
  user_id: number;
  user_type: string;
  fio: string;
}

const DEMO_PHONE =
  (process.env.NEXT_PUBLIC_SOTUV_DEMO_PHONE || "").trim() || "+998901112233";
const DEMO_PASSWORD = process.env.NEXT_PUBLIC_SOTUV_DEMO_PASSWORD || "ahlan123";
const HAS_DEMO = true;

export default function SotuvLoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    phone_number: HAS_DEMO ? DEMO_PHONE : "",
    password: HAS_DEMO ? DEMO_PASSWORD : "",
  });

  useEffect(() => {
    setFormData({ phone_number: DEMO_PHONE, password: DEMO_PASSWORD });
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      let phone = (formData.phone_number || "").trim().replace(/\s/g, "");
      if (phone && !phone.startsWith("+")) phone = `+${phone}`;

      const response = await fetch(`${getApiBaseUrl()}/login/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone_number: phone,
          password: formData.password,
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        let errorMessage = "Telefon raqami yoki parol noto'g'ri";
        if (data?.detail) errorMessage = data.detail;
        else if (data && typeof data === "object") {
          const keys = Object.keys(data);
          if (keys.length > 0)
            errorMessage = keys
              .map((k) => `${k}: ${Array.isArray(data[k]) ? data[k].join(", ") : data[k]}`)
              .join("; ");
        }
        throw new Error(errorMessage);
      }

      if (data.access) {
        localStorage.setItem("access_token", data.access);
        if (data.refresh) localStorage.setItem("refresh_token", data.refresh);
        localStorage.setItem("sales_module", "true");

        try {
          const decoded = jwtDecode<DecodedToken>(data.access);
          if (decoded.user_type != null) localStorage.setItem("user_type", decoded.user_type);
          if (decoded.fio) localStorage.setItem("user_fio", decoded.fio);
          if (decoded.user_id != null) localStorage.setItem("userId", String(decoded.user_id));
        } catch {
          // ignore decode errors
        }

        showToast({ title: "Sotuv bo'limiga xush kelibsiz", description: "Muvaffaqiyatli kirdingiz" });
        router.push("/sotuv");
      } else {
        throw new Error("Serverdan token qaytmadi.");
      }
    } catch (error: unknown) {
      showToast({
        title: "Xatolik",
        description: getErrorMessage(error, "Kirishda xatolik"),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = () => {
    if (HAS_DEMO) setFormData({ phone_number: DEMO_PHONE, password: DEMO_PASSWORD });
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-primary/10 to-slate-900 p-4">
      <Card className="w-full max-w-md rounded-2xl border-2 shadow-2xl">
        <CardHeader className="space-y-1 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/20">
            <Building2 className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl font-semibold">Sotuv bo&apos;limi</CardTitle>
          <CardDescription>
            Mijozlarga uylarni ko&apos;rsatish, 3D/Virtual tur va shartnomalar uchun tizimga kiring
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="phone_number">Telefon raqami</Label>
              <Input
                id="phone_number"
                name="phone_number"
                type="tel"
                placeholder={HAS_DEMO ? DEMO_PHONE : "+998901234567"}
                value={formData.phone_number}
                onChange={handleChange}
                required
                className="rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Parol</Label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="••••••••"
                value={formData.password}
                onChange={handleChange}
                required
                className="rounded-xl"
              />
            </div>
            <Button type="submit" className="w-full rounded-xl" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Kirilmoqda...
                </>
              ) : (
                "Sotuv bo'limiga kirish"
              )}
            </Button>
          </form>
        </CardContent>
        {HAS_DEMO && (
        <CardFooter className="flex flex-col gap-3 border-t pt-6">
          <p className="text-center text-sm text-muted-foreground">Demo: avtomatik to&apos;ldirilgan</p>
          <div className="rounded-xl border bg-muted/30 px-3 py-2 text-center text-sm text-muted-foreground">
            <div>Tel: {DEMO_PHONE}</div>
            <div>Parol: ****</div>
          </div>
          <Button variant="outline" size="sm" className="w-full rounded-xl" onClick={fillDemo} type="button">
            Demo ma&apos;lumotlarni qayta to&apos;ldirish
          </Button>
        </CardFooter>
        )}
      </Card>
    </div>
  );
}
