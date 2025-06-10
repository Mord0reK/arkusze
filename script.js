// Zmienne globalne
let arkusze = [];
let dostepneTagi = [];
let aktywneTagi = [];

// Ładowanie danych z JSON
async function loadData() {
    try {
        const response = await fetch('arkusze_data.json');
        const data = await response.json();
        
        // Sortowanie arkuszy po dacie (najnowsze pierwsze)
        arkusze = data.arkusze.sort((a, b) => {
            const dateA = new Date(a.data + '-01');
            const dateB = new Date(b.data + '-01');
            return dateB - dateA;
        });
        
        // Załadowanie tagów z pliku lub dynamiczne wygenerowanie
        if (data.dostepne_tagi && data.dostepne_tagi.length) {
            dostepneTagi = data.dostepne_tagi;
        } else {
            // Automatyczne generowanie tagów
            const tagsSet = new Set();
            arkusze.forEach(arkusz => {
                arkusz.tagi.forEach(tag => tagsSet.add(tag));
            });
            dostepneTagi = Array.from(tagsSet).sort();
        }
        
        renderTags();
        filterArkusze();
        
        // Aktualizacja liczników
        document.getElementById('total-arkusze').textContent = arkusze.length;
        document.getElementById('total-tags').textContent = dostepneTagi.length;
    } catch (error) {
        console.error('Błąd ładowania danych:', error);
        showError();
    }
}

// Renderowanie tagów
function renderTags() {
    const tagFilter = document.getElementById('tag-filter');
    tagFilter.innerHTML = '';
    
    // Przycisk "Wszystkie"
    const allTag = document.createElement('div');
    allTag.className = 'tag active';
    allTag.textContent = 'Wszystkie';
    allTag.onclick = () => resetTags();
    tagFilter.appendChild(allTag);

    // Pozostałe tagi
    dostepneTagi.forEach(tag => {
        const tagElement = document.createElement('div');
        tagElement.className = 'tag';
        tagElement.textContent = tag;
        tagElement.dataset.tag = tag;
        tagElement.onclick = () => toggleTag(tag);
        tagFilter.appendChild(tagElement);
    });
}

// Funkcja resetująca wszystkie aktywne tagi
function resetTags() {
    aktywneTagi = [];
    updateTagsUI();
    filterArkusze();
}

// Funkcja przełączająca tag (dodaje/usuwa z aktywnych)
function toggleTag(tag) {
    const index = aktywneTagi.indexOf(tag);
    if (index === -1) {
        aktywneTagi.push(tag);
    } else {
        aktywneTagi.splice(index, 1);
    }
    updateTagsUI();
    filterArkusze();
}

// Aktualizacja wyglądu tagów na podstawie aktywnych tagów
function updateTagsUI() {
    // Aktualizacja przycisku "Wszystkie"
    const allTagButton = document.querySelector('.tag');
    if (aktywneTagi.length === 0) {
        allTagButton.classList.add('active');
    } else {
        allTagButton.classList.remove('active');
    }
    
    // Aktualizacja pozostałych tagów
    document.querySelectorAll('.tag[data-tag]').forEach(tagElement => {
        const tag = tagElement.dataset.tag;
        if (aktywneTagi.includes(tag)) {
            tagElement.classList.add('active');
        } else {
            tagElement.classList.remove('active');
        }
    });
    
    // Aktualizacja licznika aktywnych filtrów
    updateActiveFiltersInfo(aktywneTagi.length);
}

// Funkcja aktualizująca informacje o aktywnych filtrach
function updateActiveFiltersInfo(activeFiltersCount) {
    const activeFiltersElement = document.getElementById('active-filters');
    if (activeFiltersElement) {
        activeFiltersElement.textContent = activeFiltersCount;
        
        const activeFiltersContainer = document.querySelector('.active-filters-container');
        if (activeFiltersContainer) {
            if (activeFiltersCount > 0) {
                activeFiltersContainer.style.display = 'block';
            } else {
                activeFiltersContainer.style.display = 'none';
            }
        }
    }
}

// Filtrowanie arkuszy
function filterArkusze() {
    const searchTerm = document.getElementById('search').value.toLowerCase();
    
    let filtered = arkusze.filter(arkusz => {
        const matchesSearch = arkusz.nazwa.toLowerCase().includes(searchTerm) ||
                            arkusz.sesja.toLowerCase().includes(searchTerm) ||
                            arkusz.tagi.some(tag => tag.toLowerCase().includes(searchTerm));
        
        // Sprawdzanie zgodności z aktywnymi tagami
        const matchesTags = aktywneTagi.length === 0 || 
                           aktywneTagi.every(tag => arkusz.tagi.includes(tag));
        
        return matchesSearch && matchesTags;
    });

    renderArkusze(filtered);
}

// Renderowanie arkuszy
function renderArkusze(filteredArkusze = arkusze) {
    const container = document.getElementById('arkusze-container');
    const noResults = document.getElementById('no-results');
    
    document.getElementById('visible-arkusze').textContent = filteredArkusze.length;

    if (filteredArkusze.length === 0) {
        container.style.display = 'none';
        noResults.style.display = 'block';
        return;
    }

    container.style.display = 'flex';
    noResults.style.display = 'none';
    
    container.innerHTML = filteredArkusze.map(arkusz => `
        <div class="arkusz-card">
            <div class="arkusz-left">
                <div class="arkusz-header">
                    <div class="arkusz-icon">
                        <i class="fas fa-file-pdf"></i>
                    </div>
                    <div class="arkusz-info">
                        <h3>${arkusz.nazwa}</h3>
                        <div class="sesja">${arkusz.sesja}</div>
                    </div>
                </div>
            </div>
            
            <div class="arkusz-tags">
                ${arkusz.tagi.map(tag => `<span class="arkusz-tag">${tag}</span>`).join('')}
            </div>
            
            <div class="arkusz-actions">
                <button class="btn btn-primary" onclick="previewPDF('${arkusz.plik}', '${arkusz.nazwa}')">
                    <i class="fas fa-eye"></i> Podgląd
                </button>
                <a href="arkusze/${arkusz.plik}" class="btn btn-secondary" download>
                    <i class="fas fa-download"></i> Pobierz
                </a>
                ${arkusz.plikiRozwiazan && arkusz.plikiRozwiazan.length > 0 ? `
                <button class="btn btn-success btn-solution" onclick="showSolutionsModal('${arkusz.plik}', '${arkusz.nazwa}')">
                    <i class="fas fa-lightbulb"></i> Rozwiązanie
                </button>
                ` : ''}
            </div>
        </div>
    `).join('');
}

// Funkcja podglądu PDF
function previewPDF(filename, title) {
    // Znajdź dane arkusza
    const arkusz = arkusze.find(a => a.plik === filename);
    if (!arkusz) return;
    
    // Ustaw modal
    const modal = document.getElementById('pdf-modal');
    const viewer = document.getElementById('pdf-viewer');
    const downloadLink = document.getElementById('modal-download');
    
    // Panel informacyjny
    const arkuszNazwaHeader = document.getElementById('modal-arkusz-nazwa-header');
    const arkuszNazwa = document.getElementById('modal-arkusz-nazwa');
    const arkuszSesja = document.getElementById('modal-arkusz-sesja');
    const arkuszData = document.getElementById('modal-arkusz-data');
    const modalTags = document.getElementById('modal-tags');
    
    // Wypełnij informacje
    arkuszNazwaHeader.textContent = arkusz.nazwa;
    arkuszNazwa.textContent = arkusz.nazwa;
    arkuszSesja.textContent = arkusz.sesja;
    arkuszData.textContent = arkusz.data;
    
    // Wypełnij tagi
    modalTags.innerHTML = '';
    arkusz.tagi.forEach(tag => {
        const tagElement = document.createElement('span');
        tagElement.className = 'modal-tag';
        tagElement.textContent = tag;
        modalTags.appendChild(tagElement);
    });
    
    // Ustaw PDF i link pobierania
    viewer.src = `arkusze/${filename}`;
    downloadLink.href = `arkusze/${filename}`;
    downloadLink.download = filename;
    
    modal.style.display = 'block';
}

// Nowa funkcja do wyświetlania modala z rozwiązaniami
function showSolutionsModal(arkuszPlik, arkuszNazwa) {
    const arkusz = arkusze.find(a => a.plik === arkuszPlik);
    if (!arkusz || !arkusz.plikiRozwiazan || arkusz.plikiRozwiazan.length === 0) {
        console.warn('Brak zdefiniowanych plików rozwiązań dla:', arkuszNazwa);
        return;
    }

    const modal = document.getElementById('solutions-modal');
    const modalTitle = document.getElementById('solutions-modal-title');
    const fileList = document.getElementById('solutions-modal-file-list');

    if (!modal || !modalTitle || !fileList) {
        console.error('Brakuje elementów HTML dla modala rozwiązań.');
        return;
    }

    modalTitle.textContent = `Rozwiązania dla: ${arkuszNazwa}`;
    fileList.innerHTML = ''; // Wyczyść poprzednią listę

    const folderRozwiazania = arkusz.plik.replace('.pdf', '');    arkusz.plikiRozwiazan.forEach(nazwaPliku => {        
        const listItem = document.createElement('li');
        const link = document.createElement('a');
        // Modyfikacja ścieżki - zapewnienie prawidłowego kodowania URL dla znaków specjalnych
        const encodedFolder = encodeURIComponent(folderRozwiazania);
        const encodedFile = encodeURIComponent(nazwaPliku);
        const filePath = `Rozwiązania/${encodedFolder}/${encodedFile}`;
        link.href = filePath;
        link.textContent = nazwaPliku;
        link.setAttribute('download', nazwaPliku); // Używamy setAttribute zamiast właściwości
        link.setAttribute('target', '_blank'); // Otwieranie w nowej karcie pomaga z plikami binarnymi
        
        // Poprawiona obsługa pobierania
        link.onclick = function(e) {
            e.preventDefault(); // Zatrzymujemy domyślną akcję
            
            // Pobieramy plik jako blob
            fetch(filePath)
                .then(response => {
                    if (!response.ok) {
                        throw new Error(`Nie można znaleźć pliku ${nazwaPliku}`);
                    }
                    // Określenie typu MIME pliku na podstawie rozszerzenia
                    let contentType;
                    if (nazwaPliku.endsWith('.pdf')) contentType = 'application/pdf';
                    else if (nazwaPliku.endsWith('.xlsx')) contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
                    else if (nazwaPliku.endsWith('.sh')) contentType = 'application/x-sh';
                    else contentType = 'application/octet-stream';
                    
                    return response.blob();
                })
                .then(blob => {
                    // Tworzenie URL dla pobieranego pliku
                    const url = window.URL.createObjectURL(blob);
                    const tempLink = document.createElement('a');
                    tempLink.href = url;
                    tempLink.download = nazwaPliku;
                    document.body.appendChild(tempLink);
                    tempLink.click();
                    document.body.removeChild(tempLink);
                    window.URL.revokeObjectURL(url);
                })
                .catch(err => {
                    console.error('Błąd pobierania:', err);
                    alert(`Błąd: ${err.message}`);
                });
        };        listItem.appendChild(link);
        fileList.appendChild(listItem);    });

    modal.style.display = 'block';
}



function showError() {
    const container = document.getElementById('arkusze-container');
    container.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; color: white; padding: 2rem;">
            <i class="fas fa-exclamation-triangle" style="font-size: 3rem; margin-bottom: 1rem;"></i>
            <h3>Błąd ładowania danych</h3>
            <p>Nie udało się załadować listy arkuszy. Sprawdź czy plik arkusze_data.json istnieje.</p>
        </div>
    `;
}

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('search').addEventListener('input', filterArkusze);

    // Modal PDF
    const pdfModal = document.getElementById('pdf-modal');
    const pdfCloseButton = document.querySelector('#pdf-modal .close'); // Bardziej precyzyjny selektor
    if (pdfCloseButton) {
        pdfCloseButton.onclick = function() {
            if (pdfModal) pdfModal.style.display = 'none';
        }
    }
    
    // Modal Rozwiązań (zakładając, że istnieje w HTML)
    const solutionsModal = document.getElementById('solutions-modal');
    const solutionsCloseButton = document.querySelector('#solutions-modal .close-solutions'); // Użyjemy klasy .close-solutions
    if (solutionsCloseButton) {
        solutionsCloseButton.onclick = function() {
            if (solutionsModal) solutionsModal.style.display = 'none';
        }
    }


    window.onclick = function(event) {
        if (event.target == pdfModal) {
            if (pdfModal) pdfModal.style.display = 'none';
        }
        if (event.target == solutionsModal) { // Obsługa zamykania modala rozwiązań
            if (solutionsModal) solutionsModal.style.display = 'none';
        }
    }

    // Ładowanie danych przy starcie
    loadData();
});
