// Funcionalidad específica para la página de inicio

document.addEventListener('DOMContentLoaded', () => {
    console.log('📰 Página de inicio cargada');
    
    // Configurar enlaces de noticias
    setupNewsLinks();
    
    // Configurar animaciones
    setupNewsAnimations();
    
    // Configurar estadísticas
    trackPageView();
});

function setupNewsLinks() {
    const newsLinks = document.querySelectorAll('.news-link');
    
    newsLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            
            const newsCard = e.target.closest('.news-card');
            const newsTitle = newsCard.querySelector('.news-title').textContent;
            
            // Efecto visual
            newsCard.style.transform = 'scale(0.98)';
            setTimeout(() => {
                newsCard.style.transform = '';
            }, 150);
            
            // Mostrar notificación
            if (window.modernNav) {
                window.modernNav.showModernNotification(
                    'Artículo Seleccionado',
                    `Cargando: ${newsTitle}`,
                    'info',
                    'bi-newspaper'
                );
            }
            
            // Simular carga de artículo
            setTimeout(() => {
                console.log(`📖 Artículo abierto: ${newsTitle}`);
                // Aquí podrías redirigir a la página del artículo
                // window.location.href = `articulo.html?id=${newsId}`;
            }, 1000);
        });
    });
}

function setupNewsAnimations() {
    // Configurar observer para animaciones al hacer scroll
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('fade-in');
                
                // Animar elementos internos
                const elements = entry.target.querySelectorAll('.news-icon, .news-title, .news-description');
                elements.forEach((el, index) => {
                    setTimeout(() => {
                        el.style.opacity = '1';
                        el.style.transform = 'translateY(0)';
                    }, index * 100);
                });
            }
        });
    }, {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    });

    // Observar todas las cards de noticias
    const newsCards = document.querySelectorAll('.news-card');
    newsCards.forEach(card => {
        observer.observe(card);
        
        // Preparar elementos para animación
        const elements = card.querySelectorAll('.news-icon, .news-title, .news-description');
        elements.forEach(el => {
            el.style.opacity = '0';
            el.style.transform = 'translateY(20px)';
            el.style.transition = 'all 0.6s ease';
        });
    });
}

function trackPageView() {
    // Registrar visita a la página
    const stats = JSON.parse(localStorage.getItem('sica-usage-stats') || '{}');
    const today = new Date().toDateString();
    
    if (!stats[today]) {
        stats[today] = {};
    }
    
    stats[today]['page_index'] = (stats[today]['page_index'] || 0) + 1;
    localStorage.setItem('sica-usage-stats', JSON.stringify(stats));
    
    console.log('📊 Visita registrada en estadísticas');
}

// Función para actualizar noticias dinámicamente
function updateNews(newsData) {
    const newsContainer = document.querySelector('.news-section .row.g-4');
    if (!newsContainer) return;
    
    newsContainer.innerHTML = '';
    
    newsData.forEach((news, index) => {
        const newsCard = createNewsCard(news);
        newsCard.style.animationDelay = `${index * 0.1}s`;
        newsContainer.appendChild(newsCard);
    });
}

function createNewsCard(newsData) {
    const col = document.createElement('div');
    col.className = 'col-lg-4 col-md-6';
    
    col.innerHTML = `
        <div class="news-card card-modern">
            <div class="news-header">
                <i class="bi ${newsData.icon} news-icon"></i>
                <div class="news-date">${newsData.date}</div>
            </div>
            <div class="news-body">
                <h5 class="news-title">${newsData.title}</h5>
                <p class="news-description">${newsData.description}</p>
                <a href="#" class="news-link" data-news-id="${newsData.id}">Leer más</a>
            </div>
        </div>
    `;
    
    return col;
}

// Función para buscar noticias
function searchNews(query) {
    const newsCards = document.querySelectorAll('.news-card');
    
    newsCards.forEach(card => {
        const title = card.querySelector('.news-title').textContent.toLowerCase();
        const description = card.querySelector('.news-description').textContent.toLowerCase();
        const searchQuery = query.toLowerCase();
        
        if (title.includes(searchQuery) || description.includes(searchQuery)) {
            card.parentElement.style.display = 'block';
            card.classList.add('highlight-search');
        } else {
            card.parentElement.style.display = 'none';
            card.classList.remove('highlight-search');
        }
    });
    
    // Agregar estilos de highlight si no existen
    if (!document.querySelector('#search-highlight-styles')) {
        const style = document.createElement('style');
        style.id = 'search-highlight-styles';
        style.textContent = `
            .highlight-search {
                border: 2px solid var(--primary-gold) !important;
                box-shadow: 0 0 20px rgba(172, 150, 90, 0.3) !important;
            }
        `;
        document.head.appendChild(style);
    }
}

// Exportar funciones para uso global
window.NewsPage = {
    updateNews,
    searchNews,
    createNewsCard
};