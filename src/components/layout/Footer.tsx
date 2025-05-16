
import { FileText } from "lucide-react";

export default function Footer() {
  return (
    <footer className="border-t py-6 md:py-0">
      <div className="container flex flex-col items-center justify-between gap-4 md:h-24 md:flex-row">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-brand-600" />
          <p className="text-sm text-muted-foreground">
            DocProcessor &copy; {new Date().getFullYear()}
          </p>
        </div>
        
        <div className="flex flex-col items-center gap-4 px-8 md:flex-row md:gap-6">
          <nav className="flex gap-4 sm:gap-6">
            <a
              className="text-sm text-muted-foreground underline-offset-4 hover:underline"
              href="#"
            >
              Privacy
            </a>
            <a
              className="text-sm text-muted-foreground underline-offset-4 hover:underline"
              href="#"
            >
              Terms
            </a>
            <a
              className="text-sm text-muted-foreground underline-offset-4 hover:underline"
              href="#"
            >
              Contact
            </a>
          </nav>
        </div>
      </div>
    </footer>
  );
}
