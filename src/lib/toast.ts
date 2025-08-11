import { toast } from "@/hooks/use-toast";

export type ToastOptions = {
  title: string;
  description?: string;
};

export function toastSuccess(opts: ToastOptions) {
  toast({ title: opts.title, description: opts.description });
}

export function toastInfo(opts: ToastOptions) {
  toast({ title: opts.title, description: opts.description });
}

export function toastWarning(opts: ToastOptions) {
  // Using default variant for warnings; keep messaging clear in title/description
  toast({ title: opts.title, description: opts.description });
}

export function toastError(opts: ToastOptions) {
  toast({ variant: "destructive", title: opts.title, description: opts.description });
}
