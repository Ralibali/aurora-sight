import { Link } from "@tanstack/react-router";

export function SiteFooter() {
  return (
    <footer className="border-t border-border/60 bg-surface">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 md:grid-cols-3">
        <div>
          <p className="font-display text-base font-semibold">Aurora GEO</p>
          <p className="mt-2 max-w-xs text-sm text-muted-foreground">
            AI-synlighet med spårbar evidens. En tjänst från Aurora Media AB.
          </p>
        </div>
        <div>
          <p className="text-sm font-semibold">Tjänsten</p>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li>
              <Link to="/priser" className="hover:text-foreground">
                Priser och paket
              </Link>
            </li>
            <li>
              <Link to="/" hash="metod" className="hover:text-foreground">
                Metod och evidens
              </Link>
            </li>
            <li>
              <Link to="/kontakt" className="hover:text-foreground">
                Boka AI-synlighetsanalys
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <p className="text-sm font-semibold">Transparens</p>
          <p className="mt-3 text-sm text-muted-foreground">
            Alla slutsatser bygger på faktiska modellsvar via API. Vi skrapar inte konsumentgränssnitt
            och lovar aldrig garanterade placeringar.
          </p>
        </div>
      </div>
      <div className="border-t border-border/60 py-6 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Aurora Media AB. Alla rättigheter förbehållna.
      </div>
    </footer>
  );
}
