"use client";

import type React from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast as showToast } from "@/hooks/use-toast";
import { jwtDecode } from "jwt-decode";
import { getApiBaseUrl } from "@/app/lib/api";
import { Loader2 } from "lucide-react";

// Decoded token uchun interfeys (payload tuzilishiga mos kelishi kerak)
interface DecodedToken {
  token_type: string;
  exp: number;
  iat: number;
  jti: string;
  user_id: number;
  user_type: string; // Sizning CustomTokenObtainPairSerializer'ingizdagi maydon
  fio: string;       // Sizning CustomTokenObtainPairSerializer'ingizdagi maydon
  // Boshqa maydonlar bo'lsa, shu yerga qo'shing
}


export default function LoginPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    phone_number: "",
    password: "",
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await fetch(`${getApiBaseUrl()}/login/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone_number: formData.phone_number,
          password: formData.password,
        }),
      })

      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        // Agar `data.detail` mavjud bo'lmasa, serverdan boshqa xatolik kelgan bo'lishi mumkin.
        // Masalan, `data.phone_number` yoki `data.password` kabi.
        // Ularni ham ko'rsatish logikasini qo'shish mumkin.
        let errorMessage = "Telefon raqami yoki parol noto‘g‘ri";
        if (data && data.detail) {
            errorMessage = data.detail;
        } else if (data && typeof data === 'object') {
            // Agar 'detail' yo'q bo'lsa, boshqa xatoliklarni izlaymiz
            const errorKeys = Object.keys(data);
            if (errorKeys.length > 0) {
                errorMessage = errorKeys.map(key => `${key}: ${Array.isArray(data[key]) ? data[key].join(', ') : data[key]}`).join('; ');
            }
        }
        throw new Error(errorMessage);
      }

      if (data.access) {
        localStorage.setItem("access_token", data.access);
        if (data.refresh) { // refresh_token mavjud bo'lsa saqlaymiz
            localStorage.setItem("refresh_token", data.refresh);
        }

        // JWT tokenini decode qilamiz
        try {
          const decodedToken = jwtDecode<DecodedToken>(data.access);

          if (decodedToken.user_type && decodedToken.fio) {
            localStorage.setItem("user_type", decodedToken.user_type);
            localStorage.setItem("user_fio", decodedToken.fio);
            if (decodedToken.user_id != null) localStorage.setItem("userId", String(decodedToken.user_id));
          } else {
            showToast({
              title: "Ma'lumotlar to'liq emas",
              description: "Foydalanuvchi turi yoki ismi token tarkibida topilmadi. Administrator bilan bog'laning.",
              variant: "destructive",
            });
            setLoading(false);
            return;
          }
        } catch {
          showToast({
            title: "Token xatoligi",
            description: "Tizimga kirish tokenini o'qishda muammo yuz berdi.",
            variant: "destructive",
          });
          setLoading(false);
          return;
        }

        showToast({
          title: "Muvaffaqiyatli kirish",
          description: "Tizimga muvaffaqiyatli kirdingiz",
        });
        router.push("/"); // Yoki xarajatlar sahifasiga: router.push("/expenses");
      } else {
        throw new Error("Serverdan token qaytmadi.");
      }

    } catch (error: any) {
      showToast({
        title: "Xatolik",
        description: error.message || "Kirishda noma'lum xatolik yuz berdi",
        variant: "destructive",
      });
    } finally {
      setLoading(false)
    }
  }

  const setDemoCredentials = (role: string) => {
    if (role === "admin") {
      setFormData({
        phone_number: "+998901234567", // O'zingizning test admin telefon raqamingiz
        password: "admin123",          // O'zingizning test admin parolingiz
      })
    } else if (role === "sales") {
      setFormData({
        phone_number: "+998901234568", // O'zingizning test sotuvchi telefon raqamingiz
        password: "sales123",          // O'zingizning test sotuvchi parolingiz
      })
    } else if (role === "accountant") {
      setFormData({
        phone_number: "+998901234569", // O'zingizning test buxgalter telefon raqamingiz
        password: "account123",          // O'zingizning test buxgalter parolingiz
      })
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center content-area p-4 gap-6">
      <Link
        href="/sotuv/login"
        className="w-full max-w-md rounded-2xl border-2 border-primary/30 bg-primary/5 hover:bg-primary/10 transition-colors flex items-center justify-center gap-3 py-4 px-6 text-primary font-semibold shadow-lg"
      >
        <span className="text-lg">🏢</span>
        Sotuv bo&apos;limi
      </Link>
      <Card className="w-full max-w-md rounded-2xl">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-semibold text-foreground">Tizimga kirish</CardTitle>
          <CardDescription className="text-muted-foreground">
            Ahlan House boshqaruv tizimiga kirish uchun ma'lumotlaringizni kiriting
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="phone_number" className="text-foreground">Telefon raqami</Label>
                <Input
                  id="phone_number"
                  name="phone_number"
                  type="tel"
                  placeholder="+998901234567"
                  value={formData.phone_number}
                  onChange={handleChange}
                  required
                  autoComplete="username"
                  className="rounded-xl border-border bg-background"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-foreground">Parol</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  autoComplete="current-password"
                  className="rounded-xl border-border bg-background"
                />
              </div>
              <Button type="submit" className="w-full rounded-xl" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Kirilmoqda...
                  </>
                ) : (
                  "Kirish"
                )}
              </Button>
            </div>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col gap-4 border-t border-border pt-6">
          <p className="text-sm text-muted-foreground text-center">
            Demo kirish — faqat test muhiti uchun. Ishlab chiqishda o&apos;chirib qo&apos;yish mumkin.
          </p>
          <Tabs defaultValue="admin" className="w-full">
            <TabsList className="grid w-full grid-cols-3 rounded-xl border border-border bg-muted/50 p-1">
              <TabsTrigger value="admin" className="rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm">
                Admin
              </TabsTrigger>
              <TabsTrigger value="sales" className="rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm">
                Sotuv
              </TabsTrigger>
              <TabsTrigger value="accountant" className="rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm">
                Buxgalter
              </TabsTrigger>
            </TabsList>
            <TabsContent value="admin" className="mt-3 space-y-2">
              <div className="rounded-xl border border-border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
                <div>Telefon: +998901234567</div>
                <div>Parol: admin123</div>
              </div>
              <Button variant="outline" size="sm" className="w-full rounded-xl" onClick={() => setDemoCredentials("admin")}>
                Admin sifatida kirish
              </Button>
            </TabsContent>
            <TabsContent value="sales" className="mt-3 space-y-2">
              <div className="rounded-xl border border-border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
                <div>Telefon: +998901234568</div>
                <div>Parol: sales123</div>
              </div>
              <Button variant="outline" size="sm" className="w-full rounded-xl" onClick={() => setDemoCredentials("sales")}>
                Sotuv bo'limi sifatida kirish
              </Button>
            </TabsContent>
            <TabsContent value="accountant" className="mt-3 space-y-2">
              <div className="rounded-xl border border-border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
                <div>Telefon: +998901234569</div>
                <div>Parol: account123</div>
              </div>
              <Button variant="outline" size="sm" className="w-full rounded-xl" onClick={() => setDemoCredentials("accountant")}>
                Buxgalter sifatida kirish
              </Button>
            </TabsContent>
          </Tabs>
        </CardFooter>
      </Card>
    </div>
  );
}
