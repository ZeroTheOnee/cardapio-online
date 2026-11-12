// Reduz a imagem no navegador e converte para JPEG.
// PNG com transparência ganha fundo branco (JPEG não tem transparência).
export function reduzirImagem(file: File, larguraMax: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const imagem = new Image();
    const url = URL.createObjectURL(file);
    imagem.onload = () => {
      URL.revokeObjectURL(url);
      const escala = Math.min(1, larguraMax / imagem.naturalWidth);
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(imagem.naturalWidth * escala));
      canvas.height = Math.max(1, Math.round(imagem.naturalHeight * escala));
      const contexto = canvas.getContext("2d");
      if (!contexto) {
        reject(new Error("Não foi possível processar esta imagem."));
        return;
      }
      contexto.fillStyle = "#ffffff";
      contexto.fillRect(0, 0, canvas.width, canvas.height);
      contexto.drawImage(imagem, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(
        (blob) =>
          blob
            ? resolve(blob)
            : reject(new Error("Não foi possível converter a imagem para JPEG.")),
        "image/jpeg",
        0.82
      );
    };
    imagem.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Não foi possível abrir esta imagem."));
    };
    imagem.src = url;
  });
}

// Converte a URL pública de um arquivo do bucket "lojas" no caminho dele
// dentro do bucket. Só aceita arquivos da pasta da própria loja.
export function caminhoDoStorage(
  url: string | null | undefined,
  lojaId: string
): string | null {
  if (!url) return null;
  const marcador = "/storage/v1/object/public/lojas/";
  const indice = url.indexOf(marcador);
  if (indice < 0) return null;
  const caminho = decodeURIComponent(
    url.slice(indice + marcador.length).split("?")[0]
  );
  return caminho.startsWith(`${lojaId}/`) ? caminho : null;
}