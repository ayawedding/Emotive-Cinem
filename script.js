// ==========================================
// CineMood - TMDB API Settings
// ==========================================
const API_KEY = 'a322fcf944ad104411340fb57c52dd4f';
const BASE_URL = 'https://api.themoviedb.org/3';
const IMAGE_URL = 'https://image.tmdb.org/t/p/w500';

// Match moods to TMDB Genre IDs
const MOOD_GENRES = {
    happy: 35,      // Comedy
    sad: 18,        // Drama
    action: 28,     // Action
    romantic: 10749, // Romance
    chill: 16       // Animation/Family
};

// 1. Manage Watchlist via LocalStorage
function getWatchlist() {
    return JSON.parse(localStorage.getItem('cineMood_watchlist_en')) || [];
}

function saveWatchlist(list) {
    localStorage.setItem('cineMood_watchlist_en', JSON.stringify(list));
    updateWatchlistCount();
}

function updateWatchlistCount() {
    const countElement = document.getElementById('watchlist-count');
    if (countElement) {
        const list = getWatchlist();
        countElement.textContent = list.length;
    }
}

// 2. On DOM Load
document.addEventListener('DOMContentLoaded', () => {
    updateWatchlistCount();
    setupTrailerModal();

    if (document.getElementById('movies-container')) {
        if (document.getElementById('empty-state')) {
            // We are on Watchlist Page
            renderWatchlistPage();
        } else {
            // We are on Home or Movies Page
            fetchMoviesFromAPI();
            setupMoodButtons();
            setupSearchAndFilter();
        }
    }
});

// 3. Fetch Movies from API (English)
async function fetchMoviesFromAPI(endpoint = '/movie/popular', params = '') {
    const container = document.getElementById('movies-container');
    if (!container) return;

    container.innerHTML = '<div style="text-align:center; grid-column:1/-1; padding:3rem; color:var(--text-muted);">Loading movies... 🎬</div>';

    try {
        const url = `${BASE_URL}${endpoint}?api_key=${API_KEY}&language=en-US${params}`;
        const response = await fetch(url);
        const data = await response.json();

        if (data.results && data.results.length > 0) {
            renderMovies(data.results);
        } else {
            container.innerHTML = '<div style="text-align:center; grid-column:1/-1; padding:3rem; color:var(--text-muted);">No movies found.</div>';
        }
    } catch (error) {
        console.error('Error fetching data:', error);
        container.innerHTML = '<div style="text-align:center; grid-column:1/-1; padding:3rem; color:var(--danger-color);">Network error occurred!</div>';
    }
}

// 4. Render Movies to Grid
function renderMovies(movies) {
    const container = document.getElementById('movies-container');
    const watchlist = getWatchlist();

    container.innerHTML = movies.map(movie => {
        const isSaved = watchlist.some(item => item.id === movie.id);
        const poster = movie.poster_path ? `${IMAGE_URL}${movie.poster_path}` : 'https://via.placeholder.com/500x750?text=No+Poster';
        const year = movie.release_date ? movie.release_date.split('-')[0] : 'N/A';
        const rating = movie.vote_average ? movie.vote_average.toFixed(1) : 'N/A';
        const title = movie.title || movie.name;
        
        // Movie description limit
        const overview = movie.overview 
            ? (movie.overview.length > 120 ? movie.overview.substring(0, 120) + '...' : movie.overview) 
            : 'No description available.';

        return `
            <article class="movie-card" data-id="${movie.id}">
                <div class="poster-box">
                    <img src="${poster}" alt="${title}">
                    <span class="badge">⭐ ${rating}</span>
                </div>
                <div class="movie-info">
                    <h3>${title}</h3>
                    <p class="meta"><span>📅 ${year}</span></p>
                    <p class="desc">${overview}</p>
                    
                    <div class="buttons-group">
                        <button class="btn-trailer" onclick="openTrailer(${movie.id})">
                            <i class="fa-solid fa-play"></i> Trailer
                        </button>
                        <button class="btn-add-watchlist ${isSaved ? 'saved' : ''}" 
                                onclick='toggleWatchlist(${JSON.stringify({id: movie.id, title: title, poster: poster, rating: rating, year: year, desc: overview}).replace(/'/g, "&apos;")})'
                                style="${isSaved ? 'background-color:#10b981; color:#fff;' : ''}">
                            <i class="${isSaved ? 'fa-solid fa-check' : 'fa-solid fa-plus'}"></i> 
                            ${isSaved ? 'Added' : 'Add to Watchlist'}
                        </button>
                    </div>
                </div>
            </article>
        `;
    }).join('');
}

// 5. Add / Remove from Watchlist
function toggleWatchlist(movieObj) {
    let watchlist = getWatchlist();
    const index = watchlist.findIndex(item => item.id === movieObj.id);

    if (index === -1) {
        watchlist.push(movieObj);
    } else {
        watchlist.splice(index, 1);
    }

    saveWatchlist(watchlist);

    if (document.getElementById('empty-state')) {
        renderWatchlistPage();
    } else {
        const btn = document.querySelector(`.movie-card[data-id="${movieObj.id}"] .btn-add-watchlist`);
        if (btn) {
            const isSaved = index === -1;
            btn.style.backgroundColor = isSaved ? '#10b981' : '#334155';
            btn.style.color = isSaved ? '#fff' : 'var(--text-color)';
            btn.innerHTML = `<i class="${isSaved ? 'fa-solid fa-check' : 'fa-solid fa-plus'}"></i> ${isSaved ? 'Added' : 'Add to Watchlist'}`;
        }
    }
}

// 6. Fetch and Open Trailer Modal
async function openTrailer(movieId) {
    try {
        const url = `${BASE_URL}/movie/${movieId}/videos?api_key=${API_KEY}&language=en-US`;
        const response = await fetch(url);
        const data = await response.json();
        
        // Find the official YouTube Trailer
        const trailer = data.results.find(v => v.type === 'Trailer' && v.site === 'YouTube') || data.results.find(v => v.site === 'YouTube');
        
        if (trailer) {
            const iframe = document.getElementById('trailer-iframe');
            iframe.src = `https://www.youtube.com/embed/${trailer.key}?autoplay=1`;
            document.getElementById('trailer-modal').style.display = 'flex';
        } else {
            alert('Sorry, no trailer available for this movie.');
        }
    } catch (error) {
        console.error('Error fetching trailer:', error);
        alert('Error loading trailer.');
    }
}

// Modal Setup
function setupTrailerModal() {
    const modal = document.getElementById('trailer-modal');
    const closeBtn = document.getElementById('close-modal');
    
    if(!modal || !closeBtn) return;

    function closeModal() {
        modal.style.display = 'none';
        document.getElementById('trailer-iframe').src = ''; // Stop video
    }

    closeBtn.onclick = closeModal;
    window.onclick = (e) => {
        if (e.target === modal) {
            closeModal();
        }
    };
}

// 7. Filter by Mood
function setupMoodButtons() {
    const moodBtns = document.querySelectorAll('.mood-btn');
    if (moodBtns.length === 0) return;

    moodBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            moodBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const mood = btn.getAttribute('data-mood');
            if (mood === 'all') {
                fetchMoviesFromAPI('/movie/popular');
            } else {
                const genreId = MOOD_GENRES[mood];
                fetchMoviesFromAPI('/discover/movie', `&with_genres=${genreId}`);
            }
        });
    });
}

// 8. Search and Filter Select
function setupSearchAndFilter() {
    const searchInput = document.getElementById('search-input');
    const moodFilter = document.getElementById('mood-filter');

    if (searchInput) {
        let debounceTimer;
        searchInput.addEventListener('input', (e) => {
            clearTimeout(debounceTimer);
            const query = e.target.value.trim();
            debounceTimer = setTimeout(() => {
                if (query.length > 0) {
                    fetchMoviesFromAPI('/search/movie', `&query=${encodeURIComponent(query)}`);
                } else {
                    fetchMoviesFromAPI('/movie/popular');
                }
            }, 500);
        });
    }

    if (moodFilter) {
        moodFilter.addEventListener('change', (e) => {
            const mood = e.target.value;
            if (mood === 'all') {
                fetchMoviesFromAPI('/movie/popular');
            } else {
                const genreId = MOOD_GENRES[mood];
                fetchMoviesFromAPI('/discover/movie', `&with_genres=${genreId}`);
            }
        });
    }
}

// 9. Render Watchlist Page
function renderWatchlistPage() {
    const container = document.getElementById('watchlist-container');
    const emptyState = document.getElementById('empty-state');
    const clearAllBtn = document.getElementById('clear-all-btn');

    if (!container) return;

    const watchlist = getWatchlist();

    if (watchlist.length === 0) {
        if (emptyState) emptyState.style.display = 'flex';
        container.innerHTML = '';
        return;
    }

    if (emptyState) emptyState.style.display = 'none';

    container.innerHTML = watchlist.map(movie => `
        <article class="movie-card" data-id="${movie.id}">
            <div class="poster-box">
                <img src="${movie.poster}" alt="${movie.title}">
                <span class="badge">⭐ ${movie.rating}</span>
            </div>
            <div class="movie-info">
                <h3>${movie.title}</h3>
                <p class="meta"><span>📅 ${movie.year}</span></p>
                <p class="desc">${movie.desc}</p>
                
                <div class="buttons-group">
                    <button class="btn-trailer" onclick="openTrailer(${movie.id})">
                        <i class="fa-solid fa-play"></i> Trailer
                    </button>
                    <button class="btn-remove-watchlist" onclick='toggleWatchlist(${JSON.stringify(movie).replace(/'/g, "&apos;")})'>
                        <i class="fa-solid fa-trash"></i> Remove
                    </button>
                </div>
            </div>
        </article>
    `).join('');

    if (clearAllBtn) {
        clearAllBtn.onclick = () => {
            saveWatchlist([]);
            renderWatchlistPage();
        };
    }
}