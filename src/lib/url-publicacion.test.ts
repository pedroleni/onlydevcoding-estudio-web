import { describe, expect, it } from "vitest";

import {
  errorUrlPublicacion,
  HOSTS_PUBLICACION,
} from "@/lib/url-publicacion";

describe("URL de publicación", () => {
  it("mantiene como fuente explícita los hosts permitidos", () => {
    expect([...HOSTS_PUBLICACION]).toEqual([
      "youtube.com",
      "www.youtube.com",
      "youtu.be",
      "instagram.com",
      "www.instagram.com",
      "tiktok.com",
      "www.tiktok.com",
      "linkedin.com",
      "www.linkedin.com",
    ]);
  });

  it.each([
    "",
    "https://youtube.com",
    "https://www.youtube.com/video",
    "https://youtu.be/abc",
    "https://instagram.com/p/abc",
    "https://www.instagram.com/p/abc",
    "https://tiktok.com/video/1",
    "https://www.tiktok.com/video/1",
    "https://linkedin.com/posts/abc",
    "https://www.linkedin.com/posts/abc",
  ])("acepta el host de publicación permitido %s", (url) => {
    expect(errorUrlPublicacion(url)).toBeNull();
  });

  it.each([
    "http://youtube.com/video",
    "https://youtube.com.evil.example/video",
    ["https://usuario", "youtube.com/video"].join("@"),
    "https://youtube.com:443/video",
    "https://youtube.com:/video",
    "https:///youtube.com/video",
    "https://youtube.com\\ruta",
    " https://youtu.be/video",
  ])("rechaza la variante de URL no permitida %s", (url) => {
    expect(errorUrlPublicacion(url)).not.toBeNull();
  });
});
