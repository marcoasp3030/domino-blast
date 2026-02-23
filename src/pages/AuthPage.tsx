import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail, Lock } from "lucide-react";
import { toast } from "sonner";
import nutricarLogo from "@/assets/nutricar-logo.webp";

export default function AuthPage() {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      toast.success("Login realizado com sucesso!");
      navigate("/");
    } catch (error: any) {
      toast.error(error.message || "Erro na autenticação");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <img src={nutricarLogo} alt="Nutricar Brasil" className="mx-auto mb-4 h-16 object-contain" />
          <h1 className="text-2xl font-bold">Nutricar Brasil</h1>
          <p className="text-sm text-muted-foreground mt-1">Entre na sua conta</p>
        </div>

        <form onSubmit={handleSubmit} className="rounded-xl border border-border bg-card p-6 space-y-4">
          <div>
            <Label htmlFor="email">Email</Label>
            <div className="relative mt-1.5">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="seu@email.com" className="pl-9" required />
            </div>
          </div>
          <div>
            <Label htmlFor="password">Senha</Label>
            <div className="relative mt-1.5">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="pl-9" required minLength={6} />
            </div>
          </div>

          <Button type="submit" className="w-full" style={{ background: "#88BE46", color: "#fff" }} disabled={loading}>
            {loading ? "Carregando..." : "Entrar"}
          </Button>

          <p className="text-center text-xs text-muted-foreground">
            Acesso restrito. Solicite suas credenciais ao administrador.
          </p>
        </form>
      </div>
    </div>
  );
}
