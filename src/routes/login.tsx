import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState("signin");

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Tervetuloa takaisin");
    navigate({ to: "/strategies" });
  }

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: window.location.origin },
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Tarkista sähköpostisi vahvistuslinkki");
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-xl">LucidDirect V2 Journal</CardTitle>
          <p className="text-sm text-muted-foreground">
            Paper-forward seuranta — kirjaudu jatkaaksesi
          </p>
        </CardHeader>
        <CardContent>
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="grid grid-cols-2 w-full">
              <TabsTrigger value="signin">Kirjaudu</TabsTrigger>
              <TabsTrigger value="signup">Rekisteröidy</TabsTrigger>
            </TabsList>
            <TabsContent value="signin">
              <form onSubmit={handleSignIn} className="space-y-4 mt-4">
                <FormField id="email" label="Sähköposti" type="email" value={email} onChange={setEmail} />
                <FormField id="pw" label="Salasana" type="password" value={password} onChange={setPassword} />
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Kirjaudutaan..." : "Kirjaudu sisään"}
                </Button>
              </form>
            </TabsContent>
            <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="space-y-4 mt-4">
                <FormField id="email2" label="Sähköposti" type="email" value={email} onChange={setEmail} />
                <FormField id="pw2" label="Salasana (väh. 6 merkkiä)" type="password" value={password} onChange={setPassword} />
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Luodaan..." : "Luo tili"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
          <div className="text-xs text-muted-foreground mt-6 text-center">
            <Link to="/strategies" className="underline">Takaisin etusivulle</Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function FormField({
  id, label, type, value, onChange,
}: { id: string; label: string; type: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} type={type} value={value} onChange={(e) => onChange(e.target.value)} required />
    </div>
  );
}
