import { createContext, useContext, useEffect, useState, useCallback } from "react";

const GeoContext = createContext(null);

export function GeoProvider({ children }) {
  const [coords, setCoords] = useState(() => {
    const saved = localStorage.getItem("geo");
    return saved ? JSON.parse(saved) : null;
  });
  const [status, setStatus] = useState("idle"); // idle | requesting | granted | denied | unsupported

  const request = useCallback(() => {
    if (!navigator.geolocation) {
      setStatus("unsupported");
      return;
    }
    setStatus("requesting");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const next = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setCoords(next);
        localStorage.setItem("geo", JSON.stringify(next));
        setStatus("granted");
      },
      () => setStatus("denied"),
      { enableHighAccuracy: false, timeout: 6000, maximumAge: 300000 }
    );
  }, []);

  // auto-request once after mount if no saved coords
  useEffect(() => {
    if (!coords) request();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <GeoContext.Provider value={{ coords, setCoords, status, request }}>
      {children}
    </GeoContext.Provider>
  );
}

export const useGeo = () => useContext(GeoContext);
