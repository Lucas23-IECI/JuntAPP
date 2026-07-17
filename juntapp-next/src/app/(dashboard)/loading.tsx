export default function DashboardLoading() {
  return (
    <div className="animate-pulse space-y-6" aria-label="Cargando contenido">
      <div className="h-9 w-56 rounded-lg bg-gray-200" />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[0, 1, 2, 3].map((item) => <div key={item} className="h-28 rounded-2xl bg-gray-200" />)}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="h-72 rounded-2xl bg-gray-200" />
        <div className="h-72 rounded-2xl bg-gray-200" />
      </div>
    </div>
  );
}
