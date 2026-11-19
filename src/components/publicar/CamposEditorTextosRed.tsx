import { Contador } from "@/components/publicar/Contador";
import { LIMITES_PUBLICACION } from "@/lib/limites";
import type { RedVista, TextosEditables } from "@/lib/tipos";

const claseCampo =
  "mt-2 min-h-11 w-full border border-borde bg-carbon px-3 py-2 text-sm leading-6 text-texto placeholder:text-tenue";

export type ValoresEditorTextos = Omit<TextosEditables, "titulos" | "etiquetas" | "ajustes"> & {
  titulos: string;
  etiquetas: string;
  ajustes: string;
};

type CampoEditor = keyof ValoresEditorTextos;

function CabeceraCampo({
  htmlFor,
  children,
  contador,
}: {
  htmlFor: string;
  children: React.ReactNode;
  contador?: React.ReactNode;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <label htmlFor={htmlFor} className="text-sm font-medium">{children}</label>
      {contador}
    </div>
  );
}

function CampoArea({
  id,
  etiqueta,
  valor,
  filas,
  campo,
  contador,
  children,
  alCambiar,
}: {
  id: string;
  etiqueta: string;
  valor: string;
  filas: number;
  campo: CampoEditor;
  contador?: React.ReactNode;
  children?: React.ReactNode;
  alCambiar: (campo: CampoEditor, valor: string) => void;
}) {
  return (
    <div>
      <CabeceraCampo htmlFor={id} contador={contador}>{etiqueta}</CabeceraCampo>
      <textarea
        id={id}
        value={valor}
        onChange={(evento) => alCambiar(campo, evento.target.value)}
        rows={filas}
        className={claseCampo}
      />
      {children}
    </div>
  );
}

function ContadoresTitulos({ lineas }: { lineas: string[] }) {
  return (
    <span className="flex flex-wrap justify-end gap-2">
      {lineas
        .filter((titulo) => titulo.trim() !== "")
        .map((titulo, indice) => (
          <Contador
            key={indice}
            valor={titulo.trim()}
            limite={LIMITES_PUBLICACION.tituloYoutube}
          />
        ))}
    </span>
  );
}

function ContadoresAjustes({ lineas }: { lineas: string[] }) {
  return (
    <div className="mt-2 flex flex-wrap gap-2">
      {lineas
        .filter((linea) => linea.trim() !== "")
        .map((linea, indice) => (
          <Contador
            key={indice}
            valor={linea.trim()}
            limite={LIMITES_PUBLICACION.caracteresPorLinea}
          />
        ))}
    </div>
  );
}

export function CamposEditorTextosRed({
  valores,
  preparados,
  red,
  limiteTexto,
  id,
  alCambiar,
}: {
  valores: ValoresEditorTextos;
  preparados: TextosEditables;
  red: RedVista["red"];
  limiteTexto: number | null;
  id: (campo: string) => string;
  alCambiar: (campo: CampoEditor, valor: string) => void;
}) {
  const lineasTitulos = valores.titulos.split(/\r?\n/);
  const lineasAjustes = valores.ajustes.split(/\r?\n/);
  return (
    <>
      <CampoArea
        id={id("titulos")}
        etiqueta="Títulos, uno por línea"
        valor={valores.titulos}
        filas={4}
        campo="titulos"
        contador={red === "youtube" ? <ContadoresTitulos lineas={lineasTitulos} /> : undefined}
        alCambiar={alCambiar}
      >
        <p className="mt-2 text-xs text-tenue">El primer título será el recomendado.</p>
      </CampoArea>
      <CampoArea
        id={id("descripcion")}
        etiqueta="Descripción"
        valor={valores.descripcion ?? ""}
        filas={8}
        campo="descripcion"
        contador={
          red === "youtube" ? (
            <Contador valor={valores.descripcion ?? ""} limite={LIMITES_PUBLICACION.descripcionYoutube} />
          ) : undefined
        }
        alCambiar={alCambiar}
      />
      <div>
        <CabeceraCampo
          htmlFor={id("etiquetas")}
          contador={
            red === "youtube" ? (
              <Contador
                valor={preparados.etiquetas.join(", ")}
                limite={LIMITES_PUBLICACION.etiquetasYoutube}
              />
            ) : undefined
          }
        >
          Etiquetas separadas por comas
        </CabeceraCampo>
        <input
          id={id("etiquetas")}
          type="text"
          value={valores.etiquetas}
          onChange={(evento) => alCambiar("etiquetas", evento.target.value)}
          className={claseCampo}
        />
      </div>
      <CampoArea
        id={id("texto")}
        etiqueta="Texto"
        valor={valores.texto ?? ""}
        filas={8}
        campo="texto"
        contador={
          limiteTexto === null ? undefined : (
            <Contador valor={valores.texto ?? ""} limite={limiteTexto} />
          )
        }
        alCambiar={alCambiar}
      />
      <CampoArea
        id={id("comentario")}
        etiqueta="Comentario fijado"
        valor={valores.comentario_fijado ?? ""}
        filas={6}
        campo="comentario_fijado"
        contador={
          <Contador
            valor={valores.comentario_fijado ?? ""}
            limite={LIMITES_PUBLICACION.comentarioFijado}
          />
        }
        alCambiar={alCambiar}
      />
      <CampoArea
        id={id("ajustes")}
        etiqueta="Ajustes, uno por línea"
        valor={valores.ajustes}
        filas={6}
        campo="ajustes"
        contador={
          <Contador
            valor={preparados.ajustes.length}
            limite={LIMITES_PUBLICACION.maximoLineas}
            unidad="líneas"
          />
        }
        alCambiar={alCambiar}
      >
        <ContadoresAjustes lineas={lineasAjustes} />
      </CampoArea>
      <CampoArea
        id={id("notas")}
        etiqueta="Notas"
        valor={valores.notas ?? ""}
        filas={6}
        campo="notas"
        contador={<Contador valor={valores.notas ?? ""} limite={LIMITES_PUBLICACION.notas} />}
        alCambiar={alCambiar}
      />
    </>
  );
}
