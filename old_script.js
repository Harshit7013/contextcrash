const API_URL = 'http://localhost:5000';

document.addEventListener('DOMContentLoaded', () => {
    loadQueries();
    loadAnalytics();

    // Set up topbar search/simulate query
    const searchInput = document.querySelector('.search-input');
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && searchInput.value.trim() !== '') {
            askQuestion(searchInput.value.trim());
            searchInput.value = '';
        }
    });
});

async function loadQueries() {
    try {
        const res = await fetch(`${API_URL}/queries`);
        const queries = await res.json();
        
        const listContainer = document.querySelector('.query-list');
        listContainer.innerHTML = '';
        
        queries.forEach((q, index) => {
            const el = document.createElement('div');
            
            // Map status to classes
            let statusClass = 'success';
            let badgeClass = 'badge-success';
            let statusText = 'Success';
            
            if (q.status === 'failed') {
                statusClass = 'failed';
                badgeClass = 'badge-danger';
                statusText = 'Failed';
            } else if (q.status === 'suspicious') {
                statusClass = 'suspicious';
                badgeClass = 'badge-warning';
                statusText = 'Suspicious';
            }
            
            el.className = `query-item ${statusClass}`;
            if (index === 0) el.classList.add('active'); // default select first
            
            el.innerHTML = `
                <div class="query-header">
                    <span class="query-time">${q.timestamp || ''}</span>
                    <span class="badge ${badgeClass}">${statusText}</span>
                </div>
                <p class="query-text">${q.question || 'N/A'}</p>
            `;
            
            el.addEventListener('click', () => {
                document.querySelectorAll('.query-item').forEach(item => item.classList.remove('active'));
                el.classList.add('active');
                loadQueryDetails(q.id);
            });
            
            listContainer.appendChild(el);
            
            if (index === 0) {
                loadQueryDetails(q.id);
            }
        });
    } catch (err) {
        console.error("Failed to load queries", err);
    }
}

async function loadQueryDetails(id) {
    try {
        const res = await fetch(`${API_URL}/query/${id}`);
        const data = await res.json();
        
        // Update Center Panel
        document.querySelector('.user-question').textContent = data.question;
        document.querySelector('.time-stamp').textContent = `ID: ${data.id} • ${data.timestamp}`;
        
        // Chunks
        const chunksContainer = document.querySelector('.chunks-section');
        const chunksHTML = data.retrieved_chunks.map(chunk => {
            const scoreClass = chunk.score >= 0.7 ? 'good' : 'weak';
            return `
                <div class="chunk-card">
                    <div class="chunk-header">
                        <span class="chunk-name">${chunk.doc}</span>
                        <span class="similarity-score ${scoreClass}">${chunk.score} similarity</span>
                    </div>
                    <p class="chunk-content">${chunk.content}</p>
                </div>
            `;
        }).join('');
        
        chunksContainer.innerHTML = `
            <div class="section-title-wrap">
                <span class="label">Retrieved Chunks</span>
            </div>
            ${chunksHTML}
        `;
        
        // Prompt
        document.querySelector('.code-block code').textContent = data.prompt;
        
        // Answer
        const answerContainer = document.querySelector('.final-answer-section');
        let hlHTML = '';
        if (data.status === 'failed' || data.status === 'suspicious') {
            hlHTML = `<div class="hallucination-highlight">Note: ${data.diagnosis.cause}</div>`;
        }
        answerContainer.innerHTML = `
            <span class="label">Final Answer Generated</span>
            <div class="answer-box">
                <p>${data.answer}</p>
                ${hlHTML}
            </div>
        `;
        
        // Update Right Panel (Diagnosis)
        const diagPanel = document.querySelector('.diagnosis-panel');
        if (data.status === 'success') {
            diagPanel.style.borderColor = 'var(--accent-green)';
            diagPanel.style.boxShadow = '0 0 30px var(--accent-green-bg)';
        } else if (data.status === 'suspicious') {
            diagPanel.style.borderColor = 'var(--accent-warn)';
            diagPanel.style.boxShadow = '0 0 30px var(--accent-warn-bg)';
        } else {
            diagPanel.style.borderColor = 'var(--accent-red)';
            diagPanel.style.boxShadow = '0 0 30px var(--accent-red-glow)';
        }

        const fixSteps = data.diagnosis.fix.split('.').filter(f => f.trim().length > 0)
            .map(step => `<li>${step.trim()}</li>`).join('');

        diagPanel.innerHTML = `
            <div class="diagnosis-header">
                <h2>Failure Diagnosis</h2>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${data.status === 'success' ? 'var(--accent-green)' : 'currentColor'}" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
            </div>

            <div class="diagnosis-content">
                <div class="diag-row">
                    <span class="diag-label">Failure Type</span>
                    <span class="diag-value" style="color: ${data.status === 'success' ? 'var(--accent-green)' : 'var(--accent-red)'}">${data.diagnosis.type}</span>
                </div>
                <div class="diag-row">
                    <span class="diag-label">Confidence Score</span>
                    <span class="diag-value score">${data.diagnosis.confidence} <span class="muted">(AI meta-eval)</span></span>
                </div>
                
                <div class="cause-box">
                    <h4>Root Cause</h4>
                    <p>${data.diagnosis.cause}</p>
                </div>

                <div class="suggested-fix">
                    <h4>Suggested Fix</h4>
                    <ul class="fix-steps">
                        ${fixSteps.length > 0 ? fixSteps : '<li>No action required</li>'}
                    </ul>
                </div>

                ${!data.is_rerun && data.status !== 'success' ? `
                <button class="rerun-btn" onclick="rerunFix('${data.id}')">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 2v6h-6"></path><path d="M3 12a9 9 0 0 1 15-6.7L21 8"></path><path d="M3 22v-6h6"></path><path d="M21 12a9 9 0 0 1-15 6.7L3 16"></path></svg>
                    Re-run After Fix
                </button>` : ''}
            </div>
        `;
    } catch (err) {
        console.error("Failed to load details", err);
    }
}

async function loadAnalytics() {
    try {
        const res = await fetch(`${API_URL}/analytics`);
        const data = await res.json();
        
        const metrics = document.querySelectorAll('.metric-value');
        if (metrics.length >= 3) {
            metrics[0].innerHTML = `${data.total_queries} <span class="trend neutral">Now</span>`;
            metrics[1].innerHTML = `${(data.failure_rate * 100).toFixed(1)}% <span class="trend ${data.failure_rate > 0.2 ? 'down-bad' : 'neutral'}">Avg</span>`;
            metrics[2].innerHTML = `${data.avg_latency}s <span class="trend neutral">Local</span>`;
        }
        
        // Try filling most common errors
        const barWrap = document.querySelector('.bar-chart-wrap');
        barWrap.innerHTML = '';
        const items = Object.entries(data.failure_distribution || {});
        items.sort((a,b) => b[1] - a[1]);
        
        const colors = ['rbg', 'ybg', 'pbg'];
        const totalFails = items.reduce((acc, curr) => acc + curr[1], 0);

        items.forEach(([label, count], i) => {
            const pct = Math.round((count / (totalFails || 1)) * 100);
            const rbg = colors[i % colors.length];
            barWrap.innerHTML += `
                <div class="bar-row">
                    <span class="bar-lbl" style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${label}</span> 
                    <div class="bar ${rbg}" style="width: ${Math.max(pct, 5)}%"></div>
                    <span class="val">${count}</span>
                </div>
            `;
        });
        
    } catch (err) {
        console.error("Failed to load analytics", err);
    }
}

async function askQuestion(questionText) {
    try {
        const res = await fetch(`${API_URL}/ask`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ question: questionText })
        });
        await res.json();
        await loadQueries();
        await loadAnalytics();
    } catch(err) {
        console.error(err);
    }
}

window.rerunFix = async function(id) {
    try {
        const btn = document.querySelector('.rerun-btn');
        btn.textContent = 'Running...';
        btn.disabled = true;
        
        const res = await fetch(`${API_URL}/rerun/${id}`, {
            method: 'POST'
        });
        await res.json();
        await loadQueries();
        await loadAnalytics();
    } catch(err) {
        console.error(err);
    }
}
