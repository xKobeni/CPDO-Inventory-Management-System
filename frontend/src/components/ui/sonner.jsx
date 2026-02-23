import {
  CircleCheckIcon,
  InfoIcon,
  Loader2Icon,
  OctagonXIcon,
  TriangleAlertIcon,
} from "lucide-react"
import { useTheme } from "next-themes"
import { Toaster as Sonner } from "sonner"

const Toaster = ({
  ...props
}) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme}
      className="toaster group [&_.sonner-toast]:!bg-white [&_.sonner-toast]:!text-zinc-900 [&_.sonner-toast]:!border-zinc-200 [&_.sonner-toast]:!shadow-lg"
      icons={{
        success: <CircleCheckIcon className="size-4 text-emerald-600" />,
        info: <InfoIcon className="size-4 text-zinc-600" />,
        warning: <TriangleAlertIcon className="size-4 text-amber-600" />,
        error: <OctagonXIcon className="size-4 text-red-600" />,
        loading: <Loader2Icon className="size-4 animate-spin text-zinc-600" />,
      }}
      toastOptions={{
        style: {
          background: "#ffffff",
          color: "#18181b",
          border: "1px solid #e4e4e7",
          borderRadius: "var(--radius)",
          boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)",
        },
        classNames: {
          toast: "!bg-white !text-zinc-900 !border-zinc-200",
        },
      }}
      style={{
        "--normal-bg": "#ffffff",
        "--normal-text": "#18181b",
        "--normal-border": "#e4e4e7",
        "--border-radius": "var(--radius)",
      }}
      {...props}
    />
  )
}

export { Toaster }
