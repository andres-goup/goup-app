import { useAuth } from "@/auth/AuthContext";
import MenuSuperior from "../components/MenuSuperior";
import Logo from "../assets/goup_logo.png";

export default function Dashboard() {
  const { rol } = useAuth();

  const validRoles = ["cliente", "productor", "club", "dj"] as const;
  type RolType = typeof validRoles[number];

  const isValidRol = rol && validRoles.includes(rol as RolType);

  return (
    <div>
      {isValidRol && <MenuSuperior rol={rol as RolType} />}
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <img src={Logo} alt="GoUp" style={{ width: "200px" }} />
        <br></br>
        <h1 className="text-3xl md:text-4xl font-extrabold">
          Bienvenido a <span className="text-[#8e2afc]">GOUP</span> por favor inicia sesión.
        </h1>
      </div>
    </div>
  );
}