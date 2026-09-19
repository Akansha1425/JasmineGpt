"""
JasmineGPT — General Scientific Corpus Ingestion & FAISS Builder
================================================================
Extracts text from real Jasmine scientific papers, creates chunks using the exact
Colab chunking specification (2000 words, 400 word overlap), embeds using
BAAI/bge-small-en-v1.5, and saves the persistent FAISS index and chunk metadata.
"""
from __future__ import annotations

import os
import re
import sys
import numpy as np
import pandas as pd
import fitz
import faiss
from sentence_transformers import SentenceTransformer

sys.stdout.reconfigure(encoding="utf-8")

# ─────────────────────────────────────────────────────────────────────────────
# Real Scientific Papers Catalog
# ─────────────────────────────────────────────────────────────────────────────
REAL_PAPERS = [
    {
        "filename": "17__Scientific+Cultivation.pdf",
        "title": "Scientific Cultivation of Jasmine: A Potential Avenue for Women-led Entrepreneurship",
        "author": "K. Swarajya Lakshmi, K. Dhanumjaya Rao, M. Rajasekhar",
        "species": "Jasminum sambac / Jasminum grandiflorum / Jasminum auriculatum",
        "category": "Cultivation",
        "keyword": "cultivation, spacing, planting, soil, irrigation, fertilizer, pruning, pests, diseases",
        "year": 2017,
        "doi": "",
        "url": "https://krishi.icar.gov.in/",
        "source": "Indian Horticulture / ICAR",
    },
    {
        "filename": "D350.pdf",
        "title": "Standardization of Irrigation and Fertigation Techniques in Jasmine (Jasminum grandiflorum) var CO. 1 Pitchi",
        "author": "S. Ramesh Kumar",
        "species": "Jasminum grandiflorum",
        "category": "Irrigation",
        "keyword": "drip irrigation, fertigation, water requirement, NPK, soil moisture, yield",
        "year": 2008,
        "doi": "",
        "url": "https://krishikosh.egranth.ac.in/handle/1/581017184",
        "source": "KrishiKosh / TNAU PhD Thesis",
    },
    {
        "filename": "TH-4231.pdf",
        "title": "Effect of Plant Growth Regulators on Growth and Yield of Jasmine (Jasminum sambac L. Aiton)",
        "author": "S. Velmurugan",
        "species": "Jasminum sambac",
        "category": "Nutrition",
        "keyword": "plant growth regulators, GA3, NAA, paclobutrazol, flowering, bud yield, spacing",
        "year": 2002,
        "doi": "",
        "url": "https://krishikosh.egranth.ac.in/handle/1/581007289",
        "source": "KrishiKosh / TNAU Thesis",
    },
    {
        "filename": "th8819.pdf",
        "title": "Hormonal Regulation of Growth and Yield in Jasmine (Jasminum auriculatum Vahl.)",
        "author": "K. Rama Krishna",
        "species": "Jasminum auriculatum",
        "category": "Pruning",
        "keyword": "growth regulators, pruning, defoliation, CCC, NAA, paclobutrazol, off season flowering",
        "year": 2014,
        "doi": "",
        "url": "https://krishikosh.egranth.ac.in/handle/1/581014819",
        "source": "KrishiKosh / TNAU Thesis",
    },
    {
        "filename": "Th-5690.pdf",
        "title": "Packaging of Chemically Treated Jasmine Flowers (Jasminum auriculatum Vahl. and Jasminum grandiflorum L.)",
        "author": "N. S. Nachegowda",
        "species": "Jasminum auriculatum / Jasminum grandiflorum",
        "category": "PostHarvest",
        "keyword": "packaging, boric acid, cold storage, shelf life, ventilations, polypropylene",
        "year": 1993,
        "doi": "",
        "url": "https://krishikosh.egranth.ac.in/handle/1/581005690",
        "source": "KrishiKosh / UAS Bangalore Thesis",
    },
    {
        "filename": "7-6-140-902.pdf",
        "title": "Studies on Insect Pests and Diseases of Jasmine (Jasminum sambac L.) and their Management",
        "author": "P. R. Shinde, M. S. Joshi, D. R. Patgaonkar",
        "species": "Jasminum sambac",
        "category": "Pest",
        "keyword": "bud worm, Hendecasis duplifascialis, thrips, spider mites, blossom midge, leaf blight, IPM",
        "year": 2018,
        "doi": "https://doi.org/10.22271/chemi.2018.v7.i6y.902",
        "url": "https://www.pharmajournal.com/archives/2018/vol7issue6/PartW/7-6-140-902.pdf",
        "source": "The Pharma Innovation Journal",
    },
    {
        "filename": "sciencedomain,+Anoopdas34242023IJPSS96483.pdf",
        "title": "Evaluation of Biorational Compounds and Plant Extracts for the Management of Jasmine Bud Worm (Hendecasis duplifascialis Hampson)",
        "author": "Anoopdas R., K. Kumar, S. Jeyarani",
        "species": "Jasminum sambac",
        "category": "Pest",
        "keyword": "bud worm, Hendecasis duplifascialis, biorational compounds, neem oil, spinosad, Bacillus thuringiensis",
        "year": 2023,
        "doi": "https://doi.org/10.9734/ijpss/2023/v35i244283",
        "url": "https://journalijpss.com/index.php/IJPSS/article/view/4283",
        "source": "International Journal of Plant & Soil Science",
    },
    {
        "filename": "kauadmin,+TV+Anupama.pdf",
        "title": "Standardization of Pruning Time and Foliar Nutrition for Off-Season Flowering in Jasmine (Jasminum sambac L.)",
        "author": "T. V. Anupama, Mini Sankar, C. R. Reshma",
        "species": "Jasminum sambac",
        "category": "Pruning",
        "keyword": "pruning schedule, October pruning, defoliation, urea spray, off season flowering, Gundumalli",
        "year": 2021,
        "doi": "https://doi.org/10.24154/jhs.v16i2.1002",
        "url": "https://jhs.iihr.res.in/index.php/jhs/article/view/1002",
        "source": "Journal of Horticultural Sciences",
    },
    {
        "filename": "S-11-7-339-579.pdf",
        "title": "Impact of Drip Fertigation and Micronutrients on Growth and Flower Yield of Jasmine (Jasminum sambac L.)",
        "author": "K. Venkatesan, M. Jawaharlal, S. Subramanian",
        "species": "Jasminum sambac",
        "category": "Nutrition",
        "keyword": "drip fertigation, NPK dosage, micronutrients, zinc sulphate, ferrous sulphate, boron, flower yield",
        "year": 2022,
        "doi": "https://doi.org/10.22271/tpi.2022.v11.i7Sp.13840",
        "url": "https://www.thepharmajournal.com/archives/2022/vol11issue7S/PartAP/SP-11-7-339-579.pdf",
        "source": "The Pharma Innovation Journal",
    },
    {
        "filename": "177-177-1-PB.pdf",
        "title": "Packaging Technology for Export of Jasmine (Jasminum sambac Ait.) Flowers",
        "author": "M. Jawaharlal, S. P. Thamaraiselvi, M. Ganga",
        "species": "Jasminum sambac",
        "category": "PostHarvest",
        "keyword": "export packaging, boric acid 4%, gel ice, thermocol box, Box A, shelf life, reefer van",
        "year": 2012,
        "doi": "",
        "url": "https://jhs.iihr.res.in/index.php/jhs/article/view/177",
        "source": "Journal of Horticultural Sciences",
    },
    {
        "filename": "Sushree Choudhury, et al.pdf",
        "title": "Studies on Shelf Life Extension and Post-Harvest Management in Jasminum sambac cv. Gundumalli",
        "author": "Sushree Choudhury, L. Hemanta, R. K. Pal",
        "species": "Jasminum sambac",
        "category": "PostHarvest",
        "keyword": "shelf life, Gundumalli, low temperature storage 7°C, polypropylene packaging 24 µm, passive MAP",
        "year": 2019,
        "doi": "https://doi.org/10.20546/ijcmas.2019.809.195",
        "url": "https://www.ijcmas.com/8-9-2019/Sushree%20Choudhury,%20et%20al.pdf",
        "source": "Int. J. Curr. Microbiol. App. Sci",
    },
    {
        "filename": "Chitosan-based_biodegradable_packaging_Enhancing_t.pdf",
        "title": "Chitosan-based Biodegradable Packaging: Enhancing the Shelf Life of Jasmine (Jasminum sambac) Flowers",
        "author": "N. Ffadhilah, S. Supriyadi, B. Rahardjo",
        "species": "Jasminum sambac",
        "category": "PostHarvest",
        "keyword": "chitosan film, biodegradable packaging, 5°C cold storage, weight loss, polyphenol oxidase",
        "year": 2024,
        "doi": "https://doi.org/10.14719/pst.3120",
        "url": "https://horizonepublishing.com/journals/index.php/PST/article/view/3120",
        "source": "Plant Science Today",
    },
    {
        "filename": "Evaluationofmyceliumfoampackagingforquality.pdf",
        "title": "Evaluation of Mycelium Foam Packaging for Quality Maintenance and Long-Distance Transportation of Jasmine Flowers",
        "author": "M. Mohamed Asik, K. Swaminathan, P. Irene",
        "species": "Jasminum sambac",
        "category": "PostHarvest",
        "keyword": "mycelium foam, bio packaging, thermal insulation, vibration damping, EPS substitute, transport",
        "year": 2026,
        "doi": "https://doi.org/10.14719/pst.4510",
        "url": "https://horizonepublishing.com/journals/index.php/PST/article/view/4510",
        "source": "Plant Science Today",
    },
    {
        "filename": "14.pdf",
        "title": "Varietal Evaluation and Crop Management Practices in Jasmine (Jasminum grandiflorum and J. sambac)",
        "author": "M. Ganga, M. Jawaharlal, K. Soorianathasundaram",
        "species": "Jasminum grandiflorum / Jasminum sambac",
        "category": "Variety",
        "keyword": "varieties, MDU-1, CO-1 Pitchi, PKM-1, Gundumalli, clonal selection, yield attributes",
        "year": 2015,
        "doi": "",
        "url": "https://krishi.icar.gov.in/",
        "source": "Journal of Floriculture",
    },
    {
        "filename": "Influence_of_growth_regulating_chemicals_on_growth.pdf",
        "title": "Influence of Growth Regulating Chemicals on Growth, Flowering and Yield in Jasmine (Jasminum sambac)",
        "author": "S. P. Thamaraiselvi, M. Jawaharlal",
        "species": "Jasminum sambac",
        "category": "Cultivation",
        "keyword": "growth regulators, gibberellic acid, paclobutrazol, off-season flowering, bud size, flower yield",
        "year": 2018,
        "doi": "https://doi.org/10.24154/jhs.v13i2.221",
        "url": "https://jhs.iihr.res.in/index.php/jhs/article/view/221",
        "source": "Journal of Horticultural Sciences",
    },
    {
        "filename": "Earticlejasmine.pdf",
        "title": "Commercial Cultivation and Value Addition in Jasmine",
        "author": "P. Sindhuja, K. Rama Rao",
        "species": "Jasminum sambac",
        "category": "Cultivation",
        "keyword": "commercial cultivation, soil requirements, planting system, concrete extraction, economics",
        "year": 2022,
        "doi": "",
        "url": "https://agriexpress.in/",
        "source": "Agri Express",
    }
]

EMBED_MODEL_NAME = "BAAI/bge-small-en-v1.5"
CHUNK_SIZE = 2000
CHUNK_OVERLAP = 400


def split_text_words(text: str, size: int = CHUNK_SIZE, overlap: int = CHUNK_OVERLAP) -> list[str]:
    """Exact original Colab chunking function."""
    words = text.split()
    out = []
    i = 0
    while i < len(words):
        chunk_words = words[i : i + size]
        if len(chunk_words) > 30:
            out.append(" ".join(chunk_words))
        i += size - overlap
    return out


def build_and_save_corpus(
    downloads_dir: str = "C:/Users/nikit/Downloads",
    output_dir: str = "jasminegpt/rag/data",
):
    os.makedirs(output_dir, exist_ok=True)
    chunks = []
    chunk_id = 0

    print("Extracting text and building chunks from real scientific papers...")
    for item in REAL_PAPERS:
        pdf_path = os.path.join(downloads_dir, item["filename"])
        if not os.path.exists(pdf_path):
            print(f"Warning: PDF file not found at {pdf_path}")
            continue

        doc = fitz.open(pdf_path)
        full_text = ""
        for page_idx, page in enumerate(doc, 1):
            txt = page.get_text()
            full_text += f"\n--- Page {page_idx} ---\n" + txt

        text_chunks = split_text_words(full_text, size=CHUNK_SIZE, overlap=CHUNK_OVERLAP)
        for c in text_chunks:
            pg_match = re.search(r"--- Page (\d+) ---", c)
            page_num = int(pg_match.group(1)) if pg_match else 1
            clean_text = re.sub(r"--- Page \d+ ---\n", "", c).strip()

            chunks.append({
                "chunk_id": f"gen-chunk-{chunk_id:04d}",
                "title": item["title"],
                "author": item["author"],
                "species": item["species"],
                "category": item["category"],
                "keyword": item["keyword"],
                "year": item["year"],
                "doi": item["doi"],
                "url": item["url"],
                "source": item["source"],
                "filename": item["filename"],
                "page": page_num,
                "text": clean_text,
            })
            chunk_id += 1

    chunks_df = pd.DataFrame(chunks)
    print(f"Total chunks created: {len(chunks_df)}")

    # Save chunks CSV
    csv_path = os.path.join(output_dir, "general_chunks.csv")
    chunks_df.to_csv(csv_path, index=False, encoding="utf-8")
    print(f"Saved chunk metadata to: {csv_path}")

    # Generate embeddings
    print(f"Loading embedding model: {EMBED_MODEL_NAME}...")
    model = SentenceTransformer(EMBED_MODEL_NAME)

    print("Encoding chunk texts with normalized embeddings...")
    texts = chunks_df["text"].tolist()
    embeddings = model.encode(
        texts,
        batch_size=32,
        show_progress_bar=True,
        normalize_embeddings=True,
    )

    # Build and save FAISS IndexFlatIP
    emb = np.array(embeddings).astype("float32")
    index = faiss.IndexFlatIP(emb.shape[1])
    index.add(emb)

    faiss_path = os.path.join(output_dir, "general_faiss.index")
    faiss.write_index(index, faiss_path)
    print(f"Saved FAISS index ({index.ntotal} vectors) to: {faiss_path}")
    print("Corpus build complete!")


if __name__ == "__main__":
    base_dir = os.path.dirname(os.path.abspath(__file__))
    out_dir = os.path.join(base_dir, "data")
    build_and_save_corpus(output_dir=out_dir)
