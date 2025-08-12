import React, { useState } from "react";
import { signInWithGoogle } from "../auth/login";
import { FcGoogle } from "react-icons/fc";
import type { User } from "firebase/auth";
import { db } from "../../firebase";
import { doc, setDoc } from "firebase/firestore";


const LoginPage = () => {
  const [user, setUser] = useState<User | null>(null);

  const handleLogin = async () => {
    const userResult = await signInWithGoogle();
    if (userResult) {
      console.log("✅ Sesión iniciada:", userResult);

      await setDoc(doc(db, "usersWeb", userResult.uid), {
        uid: userResult.uid,
        email: userResult.email,
        name: userResult.displayName,
        photoURL: userResult.photoURL,
        lastLogin: new Date(),
      });

      setUser(userResult); // ✅ Ahora TypeScript lo acepta
    } else {
      console.log("❌ No se pudo iniciar sesión");
    }
  };

  return (
    <div className="flex flex-col justify-center items-center h-screen bg-gray-100 text-black">
      <button
        onClick={handleLogin}
        className="flex items-center gap-2 px-6 py-2 mb-4 bg-white text-gray-700 border rounded shadow hover:shadow-md"
      >
        <FcGoogle size={24} />
        Iniciar sesión con Google
      </button>

      {user && (
        <div className="bg-white p-4 rounded shadow">
          <p><strong>Nombre:</strong> {user.displayName}</p>
          <p><strong>Email:</strong> {user.email}</p>
          <img src={user.photoURL || ""} alt="Foto" className="w-16 h-16 rounded-full mt-2" />
        </div>
      )}
    </div>
  );
};

export default LoginPage;