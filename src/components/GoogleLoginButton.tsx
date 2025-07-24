import { FcGoogle } from "react-icons/fc"; // icono de Google

export default function GoogleLoginButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center justify-center gap-3 w-full sm:w-[300px] px-5 py-2 border border-gray-300 rounded-lg shadow-sm bg-white hover:shadow-md transition-all duration-200"
    >
      <FcGoogle size={20} />
      <span className="text-sm text-gray-700 font-medium">Continuar con Google</span>
    </button>
  );
}