import { toast } from "@/hooks/use-toast";

export type ToastOptions = {
  title: string;
  description?: string;
};

export function toastSuccess(opts: ToastOptions) {
  toast({ variant: "success", title: opts.title, description: opts.description });
}

export function toastInfo(opts: ToastOptions) {
  toast({ title: opts.title, description: opts.description });
}

export function toastWarning(opts: ToastOptions) {
  toast({ variant: "warning", title: opts.title, description: opts.description });
}

export function toastError(opts: ToastOptions) {
  toast({ variant: "destructive", title: opts.title, description: opts.description });
}
