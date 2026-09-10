import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Sparkles className="h-4 w-4" aria-hidden />
          </span>
          <span className="font-display text-lg font-semibold tracking-tight">Aurora GEO</span>
        </Link>

        <nav aria-label="Huvudmeny" className="hidden items-center gap-6 md:flex">
          <Link
            to="/"
            hash="metod"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Så fungerar det
          </Link>
          <Link
            to="/priser"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Priser
          </Link>
          <Link
            to="/kontakt"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Kontakt
          </Link>
        </nav>

        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm">
            <Link to="/auth">Logga in</Link>
          </Button>
          <Button asChild size="sm">
            <Link to="/kontakt">Boka analys</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
