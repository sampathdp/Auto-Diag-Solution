import * as React from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
}

const sizeClasses = {
  sm: "max-w-md",
  md: "max-w-lg",
  lg: "max-w-2xl",
  xl: "max-w-4xl",
};

export const Modal = ({ isOpen, onClose, title, description, children, size = "md" }: ModalProps) => {
  return (
    <Dialog.Root open={isOpen} onOpenChange={onClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 animate-in fade-in duration-200" />
        <Dialog.Content className={cn(
          "fixed left-[50%] top-[50%] translate-x-[-50%] translate-y-[-50%] w-full max-h-[90vh] overflow-y-auto z-50",
          "bg-white rounded-2xl shadow-2xl p-8 focus:outline-none",
          "animate-in zoom-in-95 fade-in duration-200",
          sizeClasses[size]
        )}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <Dialog.Title className="text-xl font-bold text-slate-900">{title}</Dialog.Title>
              {description && <Dialog.Description className="text-sm text-slate-500 mt-1">{description}</Dialog.Description>}
            </div>
            <Dialog.Close className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors">
              <X size={20} />
            </Dialog.Close>
          </div>
          <div className="mt-4">{children}</div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};
