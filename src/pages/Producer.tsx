// src/pages/Producer.tsx
import UserProducer from "@/components/UserProducer";

export default function ProductoraPage() {
  return (
    <div className="p-6 max-w-5xl mx-auto text-white">
      <h1 className="text-2xl font-bold mb-4">Mi productora</h1>
      <UserProducer />
    </div>
  );
}