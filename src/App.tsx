import {
  useState,
  type Dispatch,
  type SetStateAction,
  type ReactElement,
} from "react";
import { Card } from "./components/ui/card";
import { Button } from "./components/ui/button";
import { Switch } from "./components/ui/switch";
import { UploadCloud, CheckCircle2 } from "lucide-react";
import logo from "./assets/goup_logo.png";

/* ---------- APP ROOT ---------- */
export default function App() {
  const [mode, setMode] = useState<"club" | "prod" | "evt">("club");

  return (
    <div className="min-h-screen bg-black text-white px-4 py-6 flex flex-col gap-6 items-center">
      <img src={logo} alt="GoUp" className="w-44" />
      <div className="flex gap-2 flex-wrap justify-center">
        {([
          { k: "club", t: "Club" },
          { k: "prod", t: "Productora" },
          { k: "evt", t: "Evento" },
        ] as const).map(({ k, t }) => (
          <Button
            key={k}
            variant={mode === k ? "default" : "outline"}
            className="w-32"
            onClick={() => setMode(k)}
          >
            {t}
          </Button>
        ))}
      </div>

      {mode === "club" && <ClubForm />}
      {mode === "prod" && <ProducerForm />}
      {mode === "evt" && <EventForm />}
    </div>
  );
}

/* ---------- FORM CLUB ---------- */
function ClubForm() {
  const communes = [
    "Cerrillos",
    "Cerro Navia",
    "Conchalí",
    "El Bosque",
    "Estación Central",
    "Huechuraba",
    "La Cisterna",
    "La Florida",
    "La Granja",
    "La Pintana",
    "La Reina",
    "Las Condes",
    "Lo Barnechea",
    "Lo Espejo",
    "Lo Prado",
    "Macul",
    "Maipú",
    "Ñuñoa",
    "Pedro Aguirre Cerda",
    "Peñalolén",
    "Providencia",
    "Pudahuel",
    "Puente Alto",
    "Quilicura",
    "Quinta Normal",
    "Recoleta",
    "Renca",
    "San Bernardo",
    "San Joaquín",
    "San Miguel",
    "San Ramón",
    "Santiago",
    "Vitacura",
  ];
  return (
    <EntityCard title="Registro Club">
      {(sent, setSent) =>
        sent ? (
          <SuccessMsg />
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setSent(true);
            }}
            className="flex flex-col gap-4 text-sm"
          >
            <Input label="Nombre" required name="nombre" />
            <Input label="Correo" type="email" name="email" />
            <Input label="Teléfono" type="tel" name="tel" />
            <Textarea label="Descripción" name="desc" rows={3} />
            <Input label="Dirección" name="direccion" />
            <Select label="Comuna" name="comuna" options={communes} />
            <Input label="Aforo" required type="number" name="aforo" />

            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <Input label="Baños" type="number" name="banos" />
              <Input label="Ambientes" type="number" name="amb" />
            </div>

            {/* SUBIR IMÁGENES */}
            <FileInput label="Imagen Perfil" name="img_perfil" />
            <FileInput label="Banner" name="img_banner" />

            <h3 className="font-medium mt-2">Servicios</h3>
            {[
              "Estacionamiento",
              "Guardarropía",
              "Terraza",
              "Accesibilidad (Movilidad reducida)",
              "Wi-Fi",
              "Zona Fumadores",
            ].map((s) => (
              <ServiceSwitch key={s} label={s} name={s} />
            ))}

            <Button className="bg-[#8e2afc] hover:bg-[#7a25d8] mt-4">
              Registrar Club
            </Button>
          </form>
        )
      }
    </EntityCard>
  );
}

/* ---------- FORM PRODUCTORA ---------- */
function ProducerForm() {
  return (
    <EntityCard title="Registro Productora">
      {(sent, setSent) =>
        sent ? (
          <SuccessMsg />
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setSent(true);
            }}
            className="flex flex-col gap-4 text-sm"
          >
            <Input label="Nombre Productora" required name="nombre" />
            <Input label="Correo" required type="email" name="correo" />
            <Input label="Teléfono" name="tel" />

            {/* SUBIR IMÁGENES */}
            <FileInput label="Imagen Perfil" name="img_perfil_prod" />
            <FileInput label="Banner" name="img_banner_prod" />

            <h3 className="font-medium">Facturación (opcional)</h3>
            <Input label="RUT" name="rut" />
            <Input label="Razón Social" name="rs" />
            <Button className="bg-[#8e2afc] hover:bg-[#7a25d8] mt-4">
              Registrar Productora
            </Button>
          </form>
        )
      }
    </EntityCard>
  );
}

/* ---------- FORM EVENTO ---------- */
function EventForm() {
  const genres = ["Techno", "House", "Reguetón", "Pop", "Salsa", "Trap", "Rock"];
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);

  const toggleGenre = (g: string) =>
    setSelectedGenres((prev) =>
      prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g]
    );

  return (
    <EntityCard title="Registro Evento">
      {(sent, setSent) =>
        sent ? (
          <SuccessMsg />
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              // aquí podrías enviar selectedGenres junto al resto del form
              setSent(true);
            }}
            className="flex flex-col gap-4 text-sm"
          >
            <Input label="Nombre del Evento" required name="nombre" />
            <Input label="Fecha" type="date" name="fecha" required />
            <Input label="Hora inicio" type="time" name="inicio" required />
            <Input label="Hora fin" type="time" name="fin" required />

            {/* GÉNEROS MÚLTIPLES */}
            <fieldset className="border border-[#3a3357] rounded-md p-3">
              <legend className="text-sm px-1">Géneros musicales (opcional)</legend>
              <div className="grid sm:grid-cols-2 gap-2">
                {genres.map((g) => (
                  <label key={g} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={selectedGenres.includes(g)}
                      onChange={() => toggleGenre(g)}
                    />
                    <span>{g}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            <Textarea label="Descripción" name="desc" rows={3} />
            <Input label="Edad mínima" type="number" name="edad" required />

            {/* SUBIR IMÁGENES */}
            <FileInput label="Flyer / Banner" name="flyer" />
            <FileInput label="Imagen secundaria (opcional)" name="img_sec" />

            <Button className="bg-[#8e2afc] hover:bg-[#7a25d8] mt-4">
              Registrar Evento
            </Button>
          </form>
        )
      }
    </EntityCard>
  );
}

/* ---------- COMPONENTES COMPARTIDOS ---------- */

function EntityCard({
  title,
  children,
}: {
  title: string;
  children: (
    sent: boolean,
    setSent: Dispatch<SetStateAction<boolean>>
  ) => ReactElement;
}) {
  const [sent, setSent] = useState(false);
  return (
    <Card className="w-full max-w-lg bg-[#1f1b2e] p-6 shadow-xl">
      <h2 className="text-xl font-semibold mb-4 text-center">{title}</h2>
      {children(sent, setSent)}
    </Card>
  );
}

function Input({
  label,
  ...props
}: React.ComponentProps<"input"> & { label: string }) {
  return (
    <label className="flex flex-col gap-1">
      {label}
      <input
        {...props}
        className="rounded-md px-3 py-2 bg-[#1f1b2e] border border-[#3a3357] focus:outline-none"
      />
    </label>
  );
}

function Textarea({
  label,
  ...props
}: React.ComponentProps<"textarea"> & { label: string }) {
  return (
    <label className="flex flex-col gap-1">
      {label}
      <textarea
        {...props}
        className="rounded-md px-3 py-2 bg-[#1f1b2e] border border-[#3a3357] resize-none focus:outline-none"
      />
    </label>
  );
}

function Select({
  label,
  options,
  ...props
}: { label: string; options: string[] } & React.ComponentProps<"select">) {
  return (
    <label className="flex flex-col gap-1">
      {label}
      <select
        {...props}
        className="rounded-md px-3 py-2 bg-[#1f1b2e] border border-[#3a3357] focus:outline-none"
      >
        {options.map((o) => (
          <option key={o}>{o}</option>
        ))}
      </select>
    </label>
  );
}

function ServiceSwitch({ label, name }: { label: string; name: string }) {
  return (
    <div className="flex items-center justify-between">
      <span>{label}</span>
      <Switch name={name} className="data-[state=checked]:bg-[#8e2afc]" />
    </div>
  );
}

function FileInput({
  label,
  ...props
}: React.ComponentProps<"input"> & { label: string }) {
  return (
    <label className="flex flex-col gap-1">
      {label}
      <div className="flex items-center gap-2 bg-[#1f1b2e] border border-[#3a3357] rounded-md p-2">
        <UploadCloud size={18} className="text-[#8e2afc]" />
        <input
          type="file"
          accept="image/*"
          {...props}
          className="flex-1 bg-transparent focus:outline-none"
        />
      </div>
    </label>
  );
}

function SuccessMsg() {
  return (
    <div className="flex flex-col items-center gap-3 py-6">
      <CheckCircle2 size={56} className="text-[#8e2afc]" />
      <p className="text-lg text-center">
        ¡Registro enviado!
        <br />
        Nos pondremos en contacto.
      </p>
    </div>
  );
}