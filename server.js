const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

app.use('/uploads', express.static(uploadDir));

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'uploads/'),
    filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage: storage });

let movies = [
    {
        id: 1,
        title: "Sample Tamil Action Movie",
        category: "Tamil movies",
        posterUrl: "https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=300",
        videoUrl: "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8"
    }
];

let otpStore = {};

app.post('/api/admin/login', (req, res) => {
    const { username, password } = req.body;
    if (username === 'Vickram4757' && password === 'Vickram@4757') {
        res.json({ success: true, role: 'admin' });
    } else {
        res.status(401).json({ success: false, message: 'Invalid Admin Credentials' });
    }
});

app.post('/api/user/send-otp', (req, res) => {
    const { mobile } = req.body;
    if (!mobile || mobile.length !== 10) {
        return res.status(400).json({ success: false, message: 'Enter a valid 10-digit mobile number' });
    }
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    otpStore[mobile] = otp;
    console.log(`[OTP SERVICE] OTP for ${mobile}: ${otp}`);
    res.json({ success: true, message: `OTP sent successfully. (Check logs for code: ${otp})` });
});

app.post('/api/user/verify-otp', (req, res) => {
    const { mobile, otp } = req.body;
    if (otpStore[mobile] && otpStore[mobile] === otp) {
        delete otpStore[mobile];
        res.json({ success: true, role: 'user' });
    } else {
        res.status(400).json({ success: false, message: 'Invalid OTP' });
    }
});

app.get('/api/movies', (req, res) => {
    res.json(movies);
});

app.post('/api/admin/upload-movie', upload.fields([{ name: 'poster' }, { name: 'video' }]), (req, res) => {
    const { title, category } = req.body;
    if (!req.files || !req.files['poster'] || !req.files['video']) {
        return res.status(400).json({ success: false, message: 'Poster and Video files are required.' });
    }

    const posterUrl = `/uploads/${req.files['poster'][0].filename}`;
    const videoUrl = `/uploads/${req.files['video'][0].filename}`;

    const newMovie = { id: Date.now(), title, category, posterUrl, videoUrl };
    movies.push(newMovie);
    res.json({ success: true, message: 'Movie uploaded successfully!', movie: newMovie });
});

app.delete('/api/admin/movies/:id', (req, res) => {
    const movieId = Number(req.params.id);
    movies = movies.filter(m => m.id !== movieId);
    res.json({ success: true, message: 'Movie deleted successfully!' });
});

app.get('/', (req, res) => {
    res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>StreamFlix</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <script src="https://cdn.jsdelivr.net/npm/hls.js@latest"></script>
    </head>
    <body class="bg-black text-white font-sans min-h-screen">
        <nav class="flex justify-between items-center p-4 bg-zinc-900 border-b border-zinc-800 sticky top-0 z-50">
            <h1 class="text-red-600 text-2xl font-extrabold cursor-pointer" onclick="renderHome()">STREAMFLIX</h1>
            <div id="nav-actions" class="flex gap-4">
                <button onclick="openModal('user')" class="bg-red-600 px-4 py-2 rounded font-semibold">User Login</button>
                <button onclick="openModal('admin')" class="border border-zinc-500 px-4 py-2 rounded font-semibold">Admin Login</button>
            </div>
        </nav>
        <main id="app-container" class="p-6 max-w-7xl mx-auto"></main>
        <div id="modal-overlay" class="hidden fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
            <div class="bg-zinc-900 p-6 rounded-lg w-full max-w-md relative border border-zinc-800">
                <button onclick="closeModal()" class="absolute top-3 right-3 text-zinc-400 font-bold">✕</button>
                <div id="modal-body"></div>
            </div>
        </div>
        <script>
            const categories = ['Tamil movies', 'Tamil dubbed movies', 'English Movies', 'English web series', 'Tamil dubbed web series', 'Tamil web series', 'Other language movies'];
            let currentUser = null; let generatedOtp = '';

            function renderHome() {
                fetch('/api/movies').then(res => res.json()).then(movies => {
                    let html = '';
                    if (currentUser && currentUser.role === 'admin') {
                        html += \`<div class="mb-8 p-5 bg-zinc-900 rounded-lg border border-zinc-800 flex justify-between items-center">
                            <div><h2 class="text-xl font-bold text-red-500">Admin Control Panel</h2><p class="text-sm text-zinc-400">Upload and manage movies.</p></div>
                            <button onclick="openUploadModal()" class="bg-red-600 px-5 py-2.5 rounded font-bold">Upload Movie</button>
                        </div>\`;
                    }
                    categories.forEach(cat => {
                        const catMovies = movies.filter(m => m.category === cat);
                        html += \`<div class="mb-8"><h2 class="text-lg font-bold mb-3 border-l-4 border-red-600 pl-3">\${cat}</h2><div class="flex gap-4 overflow-x-auto pb-4">\${
                            catMovies.length === 0 ? '<p class="text-zinc-600 text-sm pl-2">No movies yet.</p>' :
                            catMovies.map(m => \`<div class="min-w-[150px] w-[150px] relative group"><div onclick="playMovie('\${m.videoUrl}', '\${m.title}')" class="h-[210px] bg-zinc-800 rounded overflow-hidden cursor-pointer"><img src="\${m.posterUrl}" class="w-full h-full object-cover"></div><p class="text-sm mt-2 truncate">\${m.title}</p>\${currentUser && currentUser.role === 'admin' ? \`<button onclick="deleteMovie(\${m.id})" class="absolute top-2 right-2 bg-red-600 text-white p-1 rounded text-xs">🗑️</button>\`:'' }</div>\`).join('')
                        }</div></div>\`;
                    });
                    document.getElementById('app-container').innerHTML = html;
                });
            }

            function openModal(type) {
                const body = document.getElementById('modal-body');
                if (type === 'admin') {
                    body.innerHTML = \`<h2 class="text-xl font-bold mb-4 text-red-600">Admin Login</h2><input id="admin-user" placeholder="Username" class="w-full p-3 bg-zinc-800 mb-3 rounded border border-zinc-700"><input id="admin-pass" type="password" placeholder="Password" class="w-full p-3 bg-zinc-800 mb-4 rounded border border-zinc-700"><button onclick="verifyAdmin()" class="w-full bg-red-600 py-3 rounded font-bold">Login</button>\`;
                } else {
                    body.innerHTML = \`<h2 class="text-xl font-bold mb-4 text-red-600">User OTP Login</h2><input id="user-mobile" maxlength="10" placeholder="10-Digit Mobile Number" class="w-full p-3 bg-zinc-800 mb-3 rounded border border-zinc-700"><button onclick="sendOtp()" class="w-full bg-red-600 py-3 rounded font-bold mb-3">Send OTP</button><div id="otp-container"></div>\`;
                }
                document.getElementById('modal-overlay').classList.remove('hidden');
            }

            function closeModal() { document.getElementById('modal-overlay').classList.add('hidden'); }

            function verifyAdmin() {
                fetch('/api/admin/login', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ username: document.getElementById('admin-user').value, password: document.getElementById('admin-pass').value }) })
                .then(res => res.json()).then(data => { if(data.success){ currentUser = { role: 'admin' }; closeModal(); updateNavUI(); renderHome(); } else { alert(data.message); } });
            }

            function sendOtp() {
                const mobile = document.getElementById('user-mobile').value;
                fetch('/api/user/send-otp', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ mobile }) })
                .then(res => res.json()).then(data => {
                    alert(data.message);
                    document.getElementById('otp-container').innerHTML = \`<input id="user-otp" maxlength="6" placeholder="Enter 6-Digit OTP" class="w-full p-3 bg-zinc-800 mb-3 rounded border border-zinc-700"><button onclick="verifyOtp('\${mobile}')" class="w-full bg-green-600 py-3 rounded font-bold">Verify</button>\`;
                });
            }

            function verifyOtp(mobile) {
                fetch('/api/user/verify-otp', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ mobile, otp: document.getElementById('user-otp').value }) })
                .then(res => res.json()).then(data => { if(data.success){ currentUser = { role: 'user' }; closeModal(); updateNavUI(); renderHome(); } else { alert(data.message); } });
            }

            function updateNavUI() {
                document.getElementById('nav-actions').innerHTML = \`<span class="text-xs text-zinc-400 bg-zinc-800 px-3 py-1 rounded">Role: \${currentUser.role.toUpperCase()}</span><button onclick="logout()" class="bg-zinc-800 px-3 py-1.5 rounded text-sm">Logout</button>\`;
            }

            function logout() { currentUser = null; document.getElementById('nav-actions').innerHTML = \`<button onclick="openModal('user')" class="bg-red-600 px-4 py-2 rounded font-semibold">User Login</button><button onclick="openModal('admin')" class="border border-zinc-500 px-4 py-2 rounded font-semibold">Admin Login</button>\`; renderHome(); }

            function openUploadModal() {
                let catOpts = categories.map(c => \`<option value="\${c}">\${c}</option>\`).join('');
                document.getElementById('modal-body').innerHTML = \`<h2 class="text-xl font-bold mb-4 text-red-600">Upload Movie</h2><input id="up-title" placeholder="Title" class="w-full p-3 bg-zinc-800 mb-3 rounded border border-zinc-700"><select id="up-cat" class="w-full p-3 bg-zinc-800 mb-3 rounded border border-zinc-700">\${catOpts}</select><label class="text-xs text-zinc-400 mb-1 block">Poster Image</label><input id="up-poster" type="file" accept="image/*" class="w-full p-2 bg-zinc-800 mb-3 rounded border border-zinc-700 text-sm"><label class="text-xs text-zinc-400 mb-1 block">Video File</label><input id="up-video" type="file" accept="video/*" class="w-full p-2 bg-zinc-800 mb-4 rounded border border-zinc-700 text-sm"><button onclick="submitUpload()" class="w-full bg-red-600 py-3 rounded font-bold">Publish</button>\`;
                document.getElementById('modal-overlay').classList.remove('hidden');
            }

            function submitUpload() {
                const formData = new FormData();
                formData.append('title', document.getElementById('up-title').value);
                formData.append('category', document.getElementById('up-cat').value);
                formData.append('poster', document.getElementById('up-poster').files[0]);
                formData.append('video', document.getElementById('up-video').files[0]);
                alert('Uploading... Please wait.');
                fetch('/api/admin/upload-movie', { method: 'POST', body: formData }).then(res => res.json()).then(data => { alert(data.message); closeModal(); renderHome(); });
            }

            function deleteMovie(id) {
                if(!confirm('Delete this movie?')) return;
                fetch(\`/api/admin/movies/\${id}\`, { method: 'DELETE' }).then(res => res.json()).then(data => { alert(data.message); renderHome(); });
            }

            function playMovie(videoUrl, title) {
                document.getElementById('app-container').innerHTML = \`<button onclick="renderHome()" class="mb-4 bg-zinc-800 px-4 py-2 rounded text-sm">&larr; Back</button><h2 class="text-2xl font-bold mb-3">\${title}</h2><div class="max-w-4xl mx-auto bg-black border border-zinc-800 rounded overflow-hidden"><video id="playerElement" controls autoplay class="w-full aspect-video"></video></div>\`;
                const video = document.getElementById('playerElement');
                if (videoUrl.includes('.m3u8') && Hls.isSupported()) { const hls = new Hls(); hls.loadSource(videoUrl); hls.attachMedia(video); } else { video.src = videoUrl; }
            }

            renderHome();
        </script>
    </body>
    </html>
    `);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
