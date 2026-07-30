export default function Loading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-12 w-72 bg-[#071b34]/10" />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => <div key={index} className="h-36 border-4 border-black/20 bg-white" />)}
      </div>
      <div className="h-80 border-4 border-black/20 bg-white" />
    </div>
  );
}
