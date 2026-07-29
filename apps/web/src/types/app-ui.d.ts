import type * as React from "react";
import type { DialogProps } from "@radix-ui/react-dialog";
import type useEmblaCarousel, { UseEmblaCarouselType } from "embla-carousel-react";
import type { FieldPath, FieldValues } from "react-hook-form";
import type { ButtonProps } from "@/components/ui/button";
import type { DefaultLegendContentProps, LegendPayload, TooltipContentProps, TooltipPayloadEntry } from "recharts";

export {};

declare global {
  type CarouselApi = UseEmblaCarouselType[1];
  type UseCarouselParameters = Parameters<typeof useEmblaCarousel>;
  type CarouselOptions = UseCarouselParameters[0];
  type CarouselPlugin = UseCarouselParameters[1];

  interface CarouselProps {
    opts?: CarouselOptions;
    plugins?: CarouselPlugin;
    orientation?: "horizontal" | "vertical";
    setApi?: (api: CarouselApi) => void;
  }

  type CarouselContextProps = {
    carouselRef: ReturnType<typeof useEmblaCarousel>[0];
    api: ReturnType<typeof useEmblaCarousel>[1];
    scrollPrev: () => void;
    scrollNext: () => void;
    canScrollPrev: boolean;
    canScrollNext: boolean;
  } & CarouselProps;

  type ChartConfig = {
    [key: string]: {
      label?: React.ReactNode;
      icon?: React.ComponentType;
    } & ({ color?: string; theme?: never } | { color?: never; theme: Record<"light" | "dark", string> });
  };

  interface ChartContextProps {
    config: ChartConfig;
  }

  type ChartTooltipContentProps = React.ComponentProps<"div"> &
    TooltipContentProps & {
      hideLabel?: boolean;
      hideIndicator?: boolean;
      indicator?: "line" | "dot" | "dashed";
      nameKey?: string;
      labelKey?: string;
    };

  type ChartLegendContentProps = React.ComponentProps<"div"> &
    Pick<DefaultLegendContentProps, "payload" | "verticalAlign"> & {
      hideIcon?: boolean;
      nameKey?: string;
    };

  type FormFieldContextValue<
    TFieldValues extends FieldValues = FieldValues,
    TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
  > = {
    name: TName;
  };

  interface FormItemContextValue {
    id: string;
  }

  interface DeleteConfirmationDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: string;
    description: string;
    onConfirm: () => void;
    confirmLabel?: string;
    cancelLabel?: string;
    confirmDisabled?: boolean;
  }

  interface DatePickerProps {
    id?: string;
    value?: string | null;
    onChange: (value: string) => void;
    placeholder?: string;
    disabled?: boolean;
    className?: string;
    buttonClassName?: string;
    allowClear?: boolean;
    minDate?: string;
    maxDate?: string;
  }

  interface CommandDialogProps extends DialogProps {}

  type PaginationLinkProps = {
    isActive?: boolean;
  } & Pick<ButtonProps, "size"> & React.ComponentProps<"a">;

  interface SheetContentProps extends React.ComponentPropsWithoutRef<typeof import("@radix-ui/react-dialog").Content> {
    side?: "top" | "bottom" | "left" | "right";
  }

  type ToasterProps = React.ComponentProps<typeof import("sonner").Toaster>;

  interface SidebarContext {
    state: "expanded" | "collapsed";
    open: boolean;
    setOpen: (open: boolean) => void;
    openMobile: boolean;
    setOpenMobile: (open: boolean) => void;
    isMobile: boolean;
    toggleSidebar: () => void;
  }
}

declare module "@/components/ui/toast" {
  export type ToastProps = React.ComponentPropsWithoutRef<typeof import("@radix-ui/react-toast").Root> & {
    variant?: "default" | "destructive";
  };

  export type ToastActionElement = React.ReactElement;
}
