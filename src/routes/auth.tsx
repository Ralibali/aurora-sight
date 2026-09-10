import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sparkles } from "lucide-react";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Logga in – Aurora GEO" },
      {
        name: "description",
        content: "Logga in i Aurora GEO för att se AI-synlighet, evidens och åtgärder för dina varumärken.",
      },
      { property: "og:title", content: "Logga in – Aurora GEO" },
      { property: "og:description", content: "Åtkomst till Aurora GEO-dashboarden." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/oversikt" });
    });
  }, [navigate]);

  async function signIn(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: String(form.get("email")),
      password: String(form.get("password")),
    });
    setLoading(false);
    if (error) {
      toast.error("Inloggning misslyckades: " + error.message);
      return;
    }
    navigate({ to: "/oversikt" });
  }

  async function signUp(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email: String(form.get("email")),
      password: String(form.get("password")),
      options: {
        emailRedirectTo: `${window.location.origin}/oversikt`,
        data: {
          full_name: String(form.get("full_name") ?? ""),
          org_name: String(form.get("org_name") ?? ""),
        },
      },
    });
    setLoading(false);
    if (error) {
      toast.error("Registrering misslyckades: " + error.message);
      return;
    }
    if (data.session) {
      navigate({ to: "/oversikt" });
    } else {
      toast.success("Konto skapat. Bekräfta din e-postadress för att logga in.");
    }
  }

  async function signInWithGoogle() {
    setLoading(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    setLoading(false);
    if (result.error) {
      toast.error("Google-inloggning misslyckades.");
      return;
    }
    if (result.redirected) return;
    navigate({ to: "/oversikt" });
  }

  return (
    <div className="flex min-h-screen flex-col bg-surface">
      <header className="border-b border-border/60 bg-background/80">
        <div className="mx-auto flex h-16 max-w-6xl items-center px-4">
          <Link to="/" className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Sparkles className="h-4 w-4" aria-hidden />
            </span>
            <span className="font-display text-lg font-semibold">Aurora GEO</span>
          </Link>
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-4 py-12">
        <Card className="card-soft w-full max-w-md">
          <CardHeader>
            <CardTitle>Aurora GEO-portalen</CardTitle>
            <p className="text-sm text-muted-foreground">
              Logga in för att se AI-synlighet, evidens och åtgärder.
            </p>
          </CardHeader>
          <CardContent>
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={signInWithGoogle}
              disabled={loading}
            >
              Fortsätt med Google
            </Button>

            <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
              <span className="h-px flex-1 bg-border" />
              eller med e-post
              <span className="h-px flex-1 bg-border" />
            </div>

            <Tabs defaultValue="login">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Logga in</TabsTrigger>
                <TabsTrigger value="signup">Skapa konto</TabsTrigger>
              </TabsList>

              <TabsContent value="login">
                <form onSubmit={signIn} className="mt-4 space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email">E-post</Label>
                    <Input id="login-email" name="email" type="email" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="login-password">Lösenord</Label>
                    <Input id="login-password" name="password" type="password" required />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? "Loggar in …" : "Logga in"}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup">
                <form onSubmit={signUp} className="mt-4 space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-name">Namn</Label>
                    <Input id="signup-name" name="full_name" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-org">Organisation</Label>
                    <Input id="signup-org" name="org_name" placeholder="T.ex. Aurora Media AB" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">E-post</Label>
                    <Input id="signup-email" name="email" type="email" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Lösenord</Label>
                    <Input
                      id="signup-password"
                      name="password"
                      type="password"
                      minLength={8}
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? "Skapar konto …" : "Skapa konto"}
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    Nya konton får en egen organisation med tydligt märkt demodata så att du kan se
                    hur verktyget fungerar direkt.
                  </p>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
