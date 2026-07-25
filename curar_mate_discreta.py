#!/usr/bin/env python3
import re
import requests
from urllib.parse import quote_plus

# Fuentes confiables para Matemática Discreta
FUENTES_CONFIABLES = {
    "ROSEN": [
        "https://www.amazon.com/Discrete-Mathematics-Applications-Kenneth-Rosen/dp/0073383090",
        "https://archive.org/details/discretemathemat0000rose",
        "https://www.mheducation.com/highered/product/discrete-mathematics-its-applications-rosen/M9780073383095.html"
    ],
    "JOHNSONBAUGH": [
        "https://www.amazon.com/Discrete-Mathematics-Richard-Johnsonbaugh/dp/0321964683",
        "https://archive.org/details/discretemathemat0000john"
    ],
    "OSCAR LEVIN": [
        "https://discrete.openmathbooks.org/"
    ],
    "LEVIN": [
        "https://discrete.openmathbooks.org/"
    ],
    "CORMEN": [
        "https://mitpress.mit.edu/books/introduction-algorithms-third-edition",
        "https://archive.org/details/introductiontoal0003corm"
    ],
    "WEISS": [
        "https://www.amazon.com/Data-Structures-Algorithm-Analysis-C/dp/0132576279",
        "https://archive.org/details/datastructuresal0000weis"
    ],
    "BIGGS": [
        "https://www.amazon.com/Discrete-Mathematics-Norman-L-Biggs/dp/0198507151",
        "https://global.oup.com/academic/product/discrete-mathematics-9780198507154"
    ],
    "NESO ACADEMY": [
        "https://www.youtube.com/c/NesoAcademy"
    ],
    "LINZ & RODGER": [
        "https://www.amazon.com/Introduction-Formal-Languages-Automata-Linz/dp/144961552X"
    ]
}

def extraer_referencias(html_file):
    """Extrae todas las referencias de libros del HTML"""
    with open(html_file, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Patrones para encontrar referencias
    patrones = [
        r'<span class="level-badge[^"]*">[^<]*</span>\s*([A-Z\s&]+)\s*-?\s*(CAP\.?\s*\d+[^<]*)',
        r'([A-Z]{3,})\s*-?\s*(CAP\.?\s*\d+)',
        r'([A-Z][A-Z\s&]+)\s+-\s+(CAP\.?\s*\d+)',
    ]
    
    referencias = []
    for patron in patrones:
        matches = re.findall(patron, content, re.IGNORECASE)
        for match in matches:
            if len(match) >= 2:
                autor = match[0].strip()
                capitulo = match[1].strip() if len(match) > 1 else ""
                referencias.append((autor, capitulo))
    
    return list(set(referencias))

def buscar_url_valida(autor, capitulo="", timeout=5):
    """Busca una URL válida para la referencia"""
    autor_normalizado = autor.upper().strip()
    
    # Buscar en fuentes conocidas
    for fuente_autores, urls in FUENTES_CONFIABLES.items():
        if fuente_autores in autor_normalizado or autor_normalizado in fuente_autores:
            # Verificar si la URL es accesible
            for url in urls:
                try:
                    response = requests.head(url, timeout=timeout, allow_redirects=True)
                    if response.status_code == 200:
                        return url
                except:
                    continue
    
    # Si no se encuentra en fuentes conocidas, generar URL de búsqueda
    query = quote_plus(f"{autor} discrete mathematics{' ' + capitulo if capitulo else ''}")
    search_url = f"https://www.google.com/search?q={query}"
    return search_url

def actualizar_html_con_urls(html_file, output_file):
    """Actualiza el HTML con URLs verificadas"""
    with open(html_file, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Encontrar todas las referencias en el formato actual
    pattern = r'(<span class="level-badge[^"]*">[^<]*</span>\s*)([A-Z\s&]+(?:\s*-\s*(?:CAP\.?\s*\d+[^<]*|PP\.?\s*\d+[^<]*|EJERCICIOS[^<]*|PROBLEMAS[^<]*)?)?)'
    
    def replace_reference(match):
        prefix = match.group(1)
        referencia = match.group(2).strip()
        
        # Extraer autor
        autor_match = re.match(r'([A-Z\s&]+)(?:\s*-|\s+CAP|\s+PP|\s+EJERCICIOS|\s+PROBLEMAS)', referencia)
        if autor_match:
            autor = autor_match.group(1).strip()
            resto = referencia[len(autor):].strip()
            
            url = buscar_url_valida(autor, resto)
            if url:
                # Crear enlace clicable
                return f'{prefix}<a href="{url}" target="_blank" style="color: #B8A444; text-decoration: underline;">{referencia}</a>'
        
        return match.group(0)
    
    new_content = re.sub(pattern, replace_reference, content)
    
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write(new_content)
    
    return len(re.findall(r'<a href=', new_content))

if __name__ == "__main__":
    html_file = "Mapa_Mate_discreta2.html"
    output_file = "Mapa_Mate_discreta2_curado.html"
    
    print(f"Curando fuentes para {html_file}...")
    
    # Extraer referencias
    referencias = extraer_referencias(html_file)
    print(f"Referencias encontradas: {len(referencias)}")
    for autor, cap in referencias[:10]:
        print(f"  - {autor}: {cap}")
    
    # Actualizar HTML con URLs
    enlaces_agregados = actualizar_html_con_urls(html_file, output_file)
    
    print(f"\n✅ Proceso completado!")
    print(f"   Enlaces agregados: {enlaces_agregados}")
    print(f"   Archivo guardado: {output_file}")
