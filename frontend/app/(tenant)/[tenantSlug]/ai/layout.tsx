export default function AiLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="-mx-4 -my-6 min-h-[calc(100vh-4rem)] sm:-mx-6 sm:-my-8">
      {children}
    </div>
  );
}
