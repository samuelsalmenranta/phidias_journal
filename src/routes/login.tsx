import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

// Single shared account for password-only access.
const SHARED_EMAIL = "trader@phidias.local";


function LoginPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/strategies" });
    });
  }, [navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!password) return;
    setLoading(true);
    let { error } = await supabase.auth.signInWithPassword({
      email: SHARED_EMAIL,
      password,
    });
    // Account doesn't exist yet → create it on first launch (auto-confirm on)
    if (error && /invalid.*credentials|invalid.*login/i.test(error.message)) {
      const { error: upErr } = await supabase.auth.signUp({
        email: SHARED_EMAIL,
        password,
        options: { emailRedirectTo: window.location.origin },
      });
      if (!upErr) {
        const r = await supabase.auth.signInWithPassword({ email: SHARED_EMAIL, password });
        error = r.error;
      } else {
        error = upErr;
      }
    }
    setLoading(false);
    if (error) {
      toast.error("Väärä salasana");
      return;
    }
    toast.success("Tervetuloa");
    navigate({ to: "/strategies" });
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-xl">Phidias Risk Bounded</CardTitle>
          <p className="text-sm text-muted-foreground">
            Paper Shadow Journal — anna salasana
          </p>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="pw">Salasana</Label>
              <Input
                id="pw"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoFocus
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Avataan…" : "Avaa journali"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
