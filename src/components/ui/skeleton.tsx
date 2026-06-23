function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`animate-pulse rounded-md bg-border/50 ${className || ""}`}
      {...props}
    />
  );
}

export { Skeleton };
