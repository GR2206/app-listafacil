# Cómo usar esto con Cursor (sin perder contexto)

## Forma más fácil (recomendada)

1. Abrí el proyecto en Cursor.
2. Abrí el archivo **`MENSAJE-PARA-CURSOR.txt`** de esta carpeta.
3. Copiá **todo** el texto.
4. Pegalo en el chat de Cursor.
5. Decí: "Seguí el CHECKLIST-1-JULIO.md de la carpeta esto-para-compilar-siguiente-mes".

Cursor va a leer los archivos de esta carpeta y compilar con todo el contexto.

---

## Forma extra (opcional): regla permanente de Cursor

Si querés que Cursor **siempre** sepa de Lista Fácil en este proyecto:

1. En el proyecto, creá la carpeta `.cursor/rules/` (si no existe).
2. Copiá el archivo `regla-cursor-listafacil.mdc` de esta carpeta a `.cursor/rules/regla-cursor-listafacil.mdc`
3. Listo. En futuros chats Cursor tendrá esas instrucciones base.

**No es obligatorio.** Con pegar `MENSAJE-PARA-CURSOR.txt` alcanza para el 1 de julio.

---

## Qué NO hace esta carpeta

- **No guarda una copia del código.** El código vive en la carpeta principal del proyecto.
- Por eso es **muy importante** el respaldo (commit o ZIP) antes del 1 de julio.

---

## Si Cursor dice que no encuentra algo

Escribí:

> Leé esto-para-compilar-siguiente-mes/LEEME-PRIMERO.md y RELEASE-1.6.6.md. Compilá la 1.6.6 vc19.
