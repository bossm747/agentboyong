import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

// File Manager Loading Skeleton
export function FileManagerSkeleton() {
  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-8 w-24" />
      </div>
      
      <div className="space-y-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex items-center space-x-3">
            <Skeleton className="h-4 w-4 rounded-sm" />
            <Skeleton className="h-4 flex-1" />
            <Skeleton className="h-4 w-16" />
          </div>
        ))}
      </div>
    </div>
  );
}

// Chat Loading Skeleton
export function ChatSkeleton() {
  return (
    <div className="p-4 space-y-6">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className={cn("flex gap-3", i % 2 === 0 ? "justify-start" : "justify-end")}>
          {i % 2 === 0 && <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />}
          <div className={cn("max-w-[80%] space-y-2", i % 2 === 1 && "flex flex-col items-end")}>
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            {Math.random() > 0.5 && <Skeleton className="h-4 w-1/2" />}
          </div>
          {i % 2 === 1 && <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />}
        </div>
      ))}
    </div>
  );
}

// Background Tasks Loading Skeleton
export function BackgroundTasksSkeleton() {
  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-6 w-20" />
      </div>
      
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="border rounded-lg p-3 space-y-2">
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-6 w-16 rounded-full" />
            </div>
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-2/3" />
            <div className="flex items-center space-x-2">
              <Skeleton className="h-2 flex-1 rounded-full" />
              <Skeleton className="h-3 w-10" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Terminal Loading Skeleton
export function TerminalSkeleton() {
  return (
    <div className="p-4 bg-gray-900 text-green-400 font-mono text-sm space-y-2">
      <div className="flex items-center space-x-2">
        <Skeleton className="h-4 w-4 bg-gray-700" />
        <Skeleton className="h-4 w-40 bg-gray-700" />
      </div>
      
      {Array.from({ length: 12 }).map((_, i) => (
        <div key={i} className="flex items-center space-x-2">
          <span className="text-green-400">$</span>
          <Skeleton className={cn("h-4 bg-gray-700", 
            i % 3 === 0 ? "w-3/4" : i % 3 === 1 ? "w-1/2" : "w-5/6"
          )} />
        </div>
      ))}
    </div>
  );
}

// WebView Loading Skeleton
export function WebViewSkeleton() {
  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-48" />
        <div className="flex space-x-2">
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-8 w-20" />
        </div>
      </div>
      
      <div className="border rounded-lg p-4 space-y-4">
        <Skeleton className="h-12 w-full" />
        
        <div className="grid grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-24 w-full rounded-lg" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-3 w-3/4" />
            </div>
          ))}
        </div>
        
        <div className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-4/6" />
        </div>
      </div>
    </div>
  );
}

// System Monitor Loading Skeleton
export function SystemMonitorSkeleton() {
  return (
    <div className="p-4 space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-2 w-full rounded-full" />
          </div>
        ))}
      </div>
      
      <div className="space-y-4">
        <Skeleton className="h-6 w-32" />
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between p-2 border rounded">
              <div className="flex items-center space-x-3">
                <Skeleton className="h-6 w-6 rounded-full" />
                <Skeleton className="h-4 w-24" />
              </div>
              <div className="flex items-center space-x-2">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-6 w-16 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Generic Page Loading Skeleton
export function PageLoadingSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      <div className="border-b">
        <div className="flex h-16 items-center px-4">
          <Skeleton className="h-8 w-32" />
          <div className="ml-auto flex items-center space-x-4">
            <Skeleton className="h-8 w-8 rounded-full" />
            <Skeleton className="h-8 w-8 rounded-full" />
            <Skeleton className="h-8 w-24" />
          </div>
        </div>
      </div>
      
      <div className="flex">
        <div className="w-64 border-r p-4 space-y-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-full" />
          ))}
        </div>
        
        <div className="flex-1 p-6 space-y-6">
          <div className="space-y-2">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-96" />
          </div>
          
          <div className="grid gap-6">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="border rounded-lg p-6 space-y-4">
                <Skeleton className="h-6 w-48" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-5/6" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// Enhanced Shimmer Effect Skeleton
export function ShimmerSkeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-md bg-muted",
        "before:absolute before:inset-0 before:-translate-x-full",
        "before:animate-[shimmer_2s_infinite] before:bg-gradient-to-r",
        "before:from-transparent before:via-white/60 before:to-transparent",
        className
      )}
      {...props}
    />
  );
}

// Loading State Component with smooth transitions
export function LoadingTransition({ 
  isLoading, 
  children, 
  skeleton,
  className 
}: {
  isLoading: boolean;
  children: React.ReactNode;
  skeleton: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("transition-all duration-500 ease-in-out", className)}>
      {isLoading ? (
        <div className="animate-in fade-in-0 duration-300">
          {skeleton}
        </div>
      ) : (
        <div className="animate-in fade-in-0 duration-500">
          {children}
        </div>
      )}
    </div>
  );
}