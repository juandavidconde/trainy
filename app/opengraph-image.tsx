import { ImageResponse } from "next/og";

// Tarjeta de preview del link. Es lo que se ve dentro del chat cuando alguien
// manda trainy-production.up.railway.app por WhatsApp: reemplaza al flyer en
// PDF, con la ventaja de que llega sin descargar nada y el link sigue siendo
// tocable. Sin esto WhatsApp muestra una URL cruda que nadie abre.
//
// Se dibuja con satori: solo flexbox, sin grid, y todo contenedor con más de un
// hijo necesita display flex explícito.

export const alt = "Trainy — dejá de adivinar, entrená como un atleta";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          backgroundColor: "#0D100E",
          padding: "58px 72px",
        }}
      >
        {/* Marca */}
        <div style={{ display: "flex", alignItems: "center" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 72,
              height: 72,
              borderRadius: 20,
              backgroundColor: "#C8F169",
            }}
          >
            <svg width="40" height="40" viewBox="0 0 24 24">
              <path d="M13 2 4 14h6l-1 8 9-12h-6l1-8Z" fill="#131A05" />
            </svg>
          </div>
          <div style={{ display: "flex", flexDirection: "column", marginLeft: 20 }}>
            <div style={{ fontSize: 46, fontWeight: 700, color: "#EDF2EC", letterSpacing: -1 }}>
              trainy.
            </div>
            <div
              style={{
                fontSize: 17,
                color: "#737D75",
                letterSpacing: 4,
                textTransform: "uppercase",
                marginTop: 4,
              }}
            >
              Volt · sport-tech
            </div>
          </div>
        </div>

        {/* Promesa */}
        <div style={{ display: "flex", flexDirection: "column", marginTop: 30 }}>
          <div
            style={{
              fontSize: 21,
              color: "#45D0E8",
              letterSpacing: 4,
              textTransform: "uppercase",
            }}
          >
            Tu entrenamiento, medido
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 66,
              fontWeight: 700,
              color: "#EDF2EC",
              letterSpacing: -2,
              marginTop: 18,
            }}
          >
            Dejá de
            <span style={{ color: "#C8F169", marginLeft: 20 }}>adivinar</span>.
          </div>
          <div
            style={{
              fontSize: 66,
              fontWeight: 700,
              color: "#EDF2EC",
              letterSpacing: -2,
              marginTop: 4,
            }}
          >
            Entrená como un atleta.
          </div>
          <div style={{ fontSize: 28, color: "#A6B0A8", marginTop: 22 }}>
            Tu bloque de 12 semanas con IA y tu progreso en números.
          </div>
        </div>

        {/* Pie */}
        <div style={{ display: "flex", alignItems: "center" }}>
          <div
            style={{
              display: "flex",
              backgroundColor: "#C8F169",
              color: "#131A05",
              fontSize: 27,
              fontWeight: 700,
              padding: "16px 30px",
              borderRadius: 14,
            }}
          >
            Crear mi cuenta — gratis
          </div>
          <div style={{ fontSize: 25, color: "#737D75", marginLeft: 28 }}>
            Se instala en el celular · sin tiendas de apps
          </div>
        </div>
      </div>
    ),
    size
  );
}
