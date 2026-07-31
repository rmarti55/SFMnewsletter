export default function MinutesLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative left-1/2 right-1/2 -mx-[50vw] w-screen max-w-none">
      {children}
    </div>
  );
}
