import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";

export default function SearchBar() {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [allClubs, setAllClubs] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchClubs = async () => {
      const snapshot = await getDocs(collection(db, "club"));
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        nombre: doc.data().nombre,
      }));
      setAllClubs(data);
    };

    fetchClubs();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (inputRef.current && !inputRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    setShowSuggestions(true);

    if (value.trim() === "") {
      const randomClubs = [...allClubs].sort(() => 0.5 - Math.random()).slice(0, 10);
      setSuggestions(randomClubs);
    } else {
      const filtered = allClubs.filter(club =>
        club.nombre.toLowerCase().includes(value.toLowerCase())
      ).slice(0, 10);
      setSuggestions(filtered);
    }
  };

  const handleSelect = (clubId: string) => {
    localStorage.setItem("adminSelectedClubId", clubId);
    navigate(`/club`);
    setShowSuggestions(false);
  };

  return (
    <div className="w-full px-4 md:px-12 mt-4 relative z-20" ref={inputRef}>
      <div className="flex items-center gap-2 bg-white/10 rounded-full px-4 py-2">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
          className="w-5 h-5 text-white"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M21 21l-4.35-4.35m0 0A7.5 7.5 0 104.5 4.5a7.5 7.5 0 0012.15 12.15z"
          />
        </svg>
        <input
          type="text"
          placeholder="Busca clubes, eventos o productoras"
          className="bg-transparent text-white outline-none placeholder:text-white/60 flex-1"
          value={query}
          onChange={handleChange}
          onFocus={() => handleChange({ target: { value: query } } as React.ChangeEvent<HTMLInputElement>)}
        />
      </div>

      {showSuggestions && suggestions.length > 0 && (
        <ul className="absolute mt-2 w-full bg-black/90 border border-white/10 rounded-xl shadow-lg overflow-hidden max-h-60 overflow-y-auto">
          {suggestions.map((club) => (
            <li
              key={club.id}
              onClick={() => handleSelect(club.id)}
              className="px-4 py-2 text-white hover:bg-white/10 cursor-pointer"
            >
              {club.nombre}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}