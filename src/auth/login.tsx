import { signInWithPopup } from "firebase/auth";
import { auth, provider } from "../../firebase";

export const signInWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, provider);
    // Aquí puedes guardar el usuario en un estado o contexto
    return result.user;
  } catch (error) {
    console.error("Error al iniciar sesión con Google:", error);
    return null;
  }
  
};