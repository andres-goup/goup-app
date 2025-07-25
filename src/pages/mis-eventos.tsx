import UserEvents from "@/components/UserEvents";

export default function MisEventosPage() {
  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4 text-white">Mis eventos</h1>
      <UserEvents />
    </div>
  );
}