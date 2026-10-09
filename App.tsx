import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import {
  Activity, ArrowRight, BadgeCheck, ChevronDown, ChevronRight, Clock3, HeartPulse,
  Leaf, Menu, MessageCircle, Minus, Package, Plus, Search, ShieldCheck, ShoppingBag,
  ShoppingCart, Stethoscope, X, UserRound, LogIn, LogOut, Send, Paperclip, CheckCircle2,
  AlertCircle, Pill, Sparkles, Instagram, MapPin, Phone, Mail, BookOpen, Trash2
} from 'lucide-react'
import { hasSupabaseConfig, supabase } from './supabase'

type Product = {
  id: string; name: string; category: string; price: number; stock: number;
  description: string; badge?: string; image: string; classification: string
}
type Message = { id: string; sender_id: string; body: string; created_at: string }

const demoProducts: Product[] = [
  { id:'p1', name:'Paracetamol 500 mg', category:'Obat bebas', price:4500, stock:80, description:'Obat untuk membantu meredakan nyeri ringan dan demam. Ikuti aturan pada kemasan.', badge:'Pilihan', image:'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=700&q=85', classification:'Obat bebas' },
  { id:'p2', name:'Vitamin C 500 mg', category:'Vitamin', price:18000, stock:35, description:'Suplemen vitamin C. Gunakan sesuai petunjuk pada label produk.', badge:'Vitamin', image:'https://images.unsplash.com/photo-1616671276441-2f2c277b8bf3?auto=format&fit=crop&w=700&q=85', classification:'Suplemen' },
  { id:'p3', name:'Termometer Digital', category:'Alat kesehatan', price:32000, stock:18, description:'Alat bantu untuk mengukur suhu tubuh. Baca petunjuk penggunaan sebelum digunakan.', image:'https://images.unsplash.com/photo-1583947215259-38e31be8751f?auto=format&fit=crop&w=700&q=85', classification:'Alat kesehatan' },
  { id:'p4', name:'Hand Sanitizer 100 ml', category:'Perawatan diri', price:12000, stock:24, description:'Pembersih tangan untuk pemakaian luar. Jauhkan dari api dan mata.', image:'https://images.unsplash.com/photo-1584744982491-665216d95f8b?auto=format&fit=crop&w=700&q=85', classification:'Perawatan diri' },
  { id:'p5', name:'Zinc 20 mg', category:'Vitamin', price:15000, stock:22, description:'Suplemen mineral. Konsultasikan penggunaan bila sedang hamil, menyusui, atau menggunakan obat lain.', image:'https://images.unsplash.com/photo-1571781926291-c477ebfd024b?auto=format&fit=crop&w=700&q=85', classification:'Suplemen' },
  { id:'p6', name:'Masker Medis', category:'Alat kesehatan', price:10000, stock:60, description:'Masker sekali pakai. Ganti jika basah, kotor, atau rusak.', image:'https://images.unsplash.com/photo-1584634731339-252c581abfc5?auto=format&fit=crop&w=700&q=85', classification:'Alat kesehatan' }
]
const categories = [
  { name:'Semua produk', icon:Package, color:'mint' },
  { name:'Obat bebas', icon:Pill, color:'peach' },
  { name:'Vitamin', icon:Sparkles, color:'yellow' },
  { name:'Alat kesehatan', icon:Activity, color:'blue' },
  { name:'Perawatan diri', icon:HeartPulse, color:'pink' }
]
const formatRp = (n:number) => new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(n)

export default function App() {
  const [products, setProducts] = useState<Product[]>(demoProducts)
  const [activeCategory, setActiveCategory] = useState('Semua produk')
  const [search, setSearch] = useState('')
  const [cart, setCart] = useState<Record<string,number>>({})
  const [cartOpen, setCartOpen] = useState(false)
  const [mobileMenu, setMobileMenu] = useState(false)
  const [authOpen, setAuthOpen] = useState(false)
  const [authMode, setAuthMode] = useState<'login'|'signup'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [user, setUser] = useState<any>(null)
  const [authMessage, setAuthMessage] = useState('')
  const [consultOpen, setConsultOpen] = useState(false)
  const [consultationId, setConsultationId] = useState<string|null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [consultStatus, setConsultStatus] = useState('')
  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [customerAddress, setCustomerAddress] = useState('')
  const [orderMessage, setOrderMessage] = useState('')
  const [dbNotice, setDbNotice] = useState('')
  const [activeTab, setActiveTab] = useState<'catalog'|'orders'>('catalog')
  const messagesEnd = useRef<HTMLDivElement>(null)
  const whatsapp = (import.meta.env.VITE_WHATSAPP_NUMBER as string | undefined) || ''

  useEffect(() => {
    if (!supabase) return
    supabase.auth.getSession().then(({data}) => setUser(data.session?.user ?? null))
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => setUser(session?.user ?? null))
    return () => listener.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!supabase) {
      setDbNotice('Mode demo aktif — data produk dan keranjang belum tersambung ke database.')
      return
    }
    let cancelled = false
    supabase.from('products').select('id,name,category,price,stock,description,image_url,classification,is_featured').eq('is_active',true).order('name')
      .then(({data,error}) => {
        if (cancelled) return
        if (error) { setDbNotice('Database belum siap. Menampilkan data demo; periksa migrasi Supabase.'); return }
        if (data?.length) setProducts(data.map((p:any) => ({id:p.id,name:p.name,category:p.category ?? 'Lainnya',price:Number(p.price),stock:p.stock ?? 0,description:p.description ?? '',image:p.image_url ?? demoProducts[0].image,classification:p.classification ?? 'Perlu konfirmasi'})))
        setDbNotice(data?.length ? 'Terhubung ke katalog Supabase.' : 'Database terhubung; katalog masih kosong, menampilkan contoh sampai produk ditambahkan.')
      })
    return () => { cancelled = true }
  }, [])

  useEffect(() => { messagesEnd.current?.scrollIntoView({behavior:'smooth'}) }, [messages])

  const filteredProducts = useMemo(() => products.filter(p =>
    (activeCategory === 'Semua produk' || p.category === activeCategory) &&
    (p.name.toLowerCase().includes(search.toLowerCase()) || p.description.toLowerCase().includes(search.toLowerCase()))
  ), [products,activeCategory,search])
  const cartItems = products.filter(p => (cart[p.id] || 0) > 0)
  const cartCount = Object.values(cart).reduce((a,b)=>a+b,0)
  const cartTotal = cartItems.reduce((sum,p)=>sum + p.price * cart[p.id],0)

  async function authenticate(e:FormEvent) {
    e.preventDefault(); setAuthMessage('')
    if (!supabase) { setAuthMessage('Hubungkan Supabase terlebih dahulu melalui file .env.local.'); return }
    const result = authMode === 'signup'
      ? await supabase.auth.signUp({email,password})
      : await supabase.auth.signInWithPassword({email,password})
    if (result.error) setAuthMessage(result.error.message)
    else if (authMode === 'signup') setAuthMessage('Akun dibuat. Periksa email jika konfirmasi email diaktifkan.')
    else { setUser(result.data.user); setAuthOpen(false); setPassword('') }
  }

  async function openConsult() {
    setConsultOpen(true); setConsultStatus('')
    if (!user) { setConsultStatus('Silakan login terlebih dahulu untuk membuat konsultasi yang tersimpan.'); return }
    if (!supabase) { setConsultStatus('Mode demo: chat belum terhubung. Atur Supabase dan jalankan migrasi untuk mengaktifkannya.'); return }
    const {data,error} = await supabase.from('consultations').insert({patient_id:user.id, initial_question:'Permintaan konsultasi dari halaman utama',status:'queued'}).select('id').single()
    if (error) { setConsultStatus('Belum dapat membuat konsultasi. Pastikan migrasi database dan kebijakan akses sudah diterapkan.'); return }
    setConsultationId(data.id)
    setConsultStatus('Permintaan konsultasi tersimpan. Kamu bisa menulis pertanyaan sekarang; balasan apoteker akan masuk setelah konsultasi ditangani.')
    const {data:oldMessages} = await supabase.from('messages').select('*').eq('consultation_id',data.id).order('created_at')
    setMessages(oldMessages ?? [])
    const channel = supabase.channel(`consultation-${data.id}`).on('postgres_changes',{event:'INSERT',schema:'public',table:'messages',filter:`consultation_id=eq.${data.id}`},payload => setMessages(prev => prev.some(m=>m.id===payload.new.id)?prev:[...prev,payload.new as Message])).subscribe()
    return () => { supabase?.removeChannel(channel) }
  }

  async function sendMessage(e:FormEvent) {
    e.preventDefault()
    if (!draft.trim() || !consultationId || !supabase || !user) return
    setSending(true)
    const {error} = await supabase.from('messages').insert({consultation_id:consultationId,sender_id:user.id,body:draft.trim()})
    if (error) setConsultStatus('Pesan gagal dikirim. Periksa koneksi dan akses konsultasi.')
    else setDraft('')
    setSending(false)
  }

  async function placeOrder(e:FormEvent) {
    e.preventDefault()
    if (!user) { setOrderMessage('Login diperlukan untuk menyimpan pesanan.'); setAuthOpen(true); return }
    if (!supabase) { setOrderMessage('Mode demo: checkout belum menyimpan pesanan. Hubungkan Supabase terlebih dahulu.'); return }
    setOrderMessage('Fitur checkout memerlukan fungsi backend untuk validasi harga dan stok. Terapkan migrasi SQL dan endpoint transaksi sebelum menerima pesanan nyata.')
  }

  return <div className="app-shell">
    <div className="announcement"><span className="announce-dot" /> Teman sehatmu, lebih dekat setiap hari <span className="announce-sep">✳</span> <span className="announcement-note">Informasi obat yang mudah dipahami</span></div>
    <header className="navbar">
      <a className="brand" href="#home" aria-label="Sefizlumia beranda">
        <span className="brand-mark"><Leaf size={22} strokeWidth={2.2}/><span className="brand-cross">+</span></span>
        <span className="brand-name">sefizlumia<span>APOTEK DIGITAL</span></span>
      </a>
      <nav className={mobileMenu?'nav-links nav-open':'nav-links'}>
        <a className="nav-link active" href="#home" onClick={()=>setMobileMenu(false)}>Beranda</a>
        <a className="nav-link" href="#catalog" onClick={()=>setMobileMenu(false)}>Katalog Obat</a>
        <button className="nav-link nav-button" onClick={()=>{setMobileMenu(false);void openConsult()}}>Konsultasi</button>
        <a className="nav-link" href="#articles" onClick={()=>setMobileMenu(false)}>Artikel Kesehatan</a>
        <a className="nav-link" href="#about" onClick={()=>setMobileMenu(false)}>Tentang Kami</a>
      </nav>
      <div className="nav-actions">
        <button className="icon-button cart-trigger" aria-label="Buka keranjang" onClick={()=>setCartOpen(true)}><ShoppingBag size={19}/>{cartCount>0&&<span className="cart-badge">{cartCount}</span>}</button>
        {user ? <button className="login-button" onClick={async()=>{await supabase?.auth.signOut();setUser(null)}}><LogOut size={16}/> Keluar</button> : <button className="login-button" onClick={()=>{setAuthMode('login');setAuthOpen(true)}}><UserRound size={17}/> Masuk</button>}
        <button className="mobile-toggle" aria-label="Buka menu" onClick={()=>setMobileMenu(!mobileMenu)}>{mobileMenu?<X/>:<Menu/>}</button>
      </div>
    </header>

    <main>
      <section className="hero section-wrap" id="home">
        <div className="hero-copy">
          <div className="eyebrow"><span className="eyebrow-icon"><HeartPulse size={14}/></span> PEDULI KESEHATAN, SEPENUH HATI</div>
          <h1>Sahabat kesehatan<br/>Anda<span className="title-period">.</span></h1>
          <p className="hero-description">Temukan kebutuhan kesehatan dan dapatkan informasi penggunaan obat dengan lebih mudah. Kami hadir untuk menemani langkah sehatmu.</p>
          <div className="hero-buttons">
            <button className="btn btn-primary" onClick={()=>void openConsult()}>Konsultasi Sekarang <ArrowRight size={17}/></button>
            <a className="btn btn-secondary" href="#catalog">Cari Obat <Search size={16}/></a>
          </div>
          <div className="hero-trust">
            <span className="trust-icon"><ShieldCheck size={18}/></span>
            <span><strong>Informasi yang lebih jelas</strong><small>Gunakan obat dengan bijak dan tepat</small></span>
          </div>
          <div className="hero-decor decor-one"></div><div className="hero-decor decor-two"></div>
        </div>
        <div className="hero-visual">
          <div className="hero-photo"><img src="https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=1200&q=90" alt="Tenaga kesehatan memberikan layanan konsultasi" /></div>
          <div className="floating-card pharmacist-card"><span className="float-icon green"><Stethoscope size={20}/></span><span><strong>Konsultasi kesehatan</strong><small>Mulai dari pertanyaanmu</small></span><ChevronRight size={17}/></div>
          <div className="floating-card care-card"><span className="care-illustration"><HeartPulse size={22}/></span><span><strong>Rawat diri, setiap hari</strong><small>Langkah kecil berarti</small></span></div>
          <div className="visual-stamp"><span>SEHAT</span><HeartPulse size={20}/><span>BERSAMA</span></div>
          <div className="visual-blob"></div>
        </div>
      </section>

      <section className="service-strip section-wrap" aria-label="Layanan Sefizlumia">
        <div className="service-item"><span className="service-icon sage"><MessageCircle size={21}/></span><span><strong>Konsultasi Apoteker</strong><small>Tanyakan penggunaan obat</small></span></div>
        <div className="service-item"><span className="service-icon blue"><Package size={21}/></span><span><strong>Produk Kesehatan</strong><small>Pilihan untuk kebutuhanmu</small></span></div>
        <div className="service-item"><span className="service-icon yellow"><ShieldCheck size={21}/></span><span><strong>Informasi Tepercaya</strong><small>Utamakan keamanan obat</small></span></div>
        <div className="service-item"><span className="service-icon peach"><Clock3 size={21}/></span><span><strong>Lebih Praktis</strong><small>Akses kapan saja</small></span></div>
      </section>

      <section className="category-section section-wrap">
        <div className="section-heading compact-heading"><div><span className="eyebrow">PILIH SESUAI KEBUTUHAN</span><h2>Jelajahi kategori</h2></div><a className="text-link" href="#catalog">Lihat semua <ArrowRight size={16}/></a></div>
        <div className="category-grid">
          {categories.map((cat,i)=>{const Icon=cat.icon;return <button key={cat.name} className={`category-card ${activeCategory===cat.name?'category-selected':''}`} onClick={()=>{setActiveCategory(cat.name);document.getElementById('catalog')?.scrollIntoView({behavior:'smooth'})}}><span className={`category-icon ${cat.color}`}><Icon size={24}/></span><span className="category-name">{cat.name}</span><span className="category-arrow"><ArrowRight size={15}/></span></button>})}
        </div>
      </section>

      <section className="catalog-section" id="catalog">
        <div className="section-wrap">
          <div className="section-heading catalog-heading"><div><span className="eyebrow">PILIHAN UNTUK KESEHATANMU</span><h2>Produk pilihan</h2><p>Temukan kebutuhan kesehatan sehari-hari dalam satu tempat.</p></div><div className="catalog-tools"><label className="search-box"><Search size={18}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Cari produk..." aria-label="Cari produk"/></label><button className="filter-button" onClick={()=>setActiveCategory('Semua produk')}>Semua kategori <ChevronDown size={15}/></button></div></div>
          <div className="filter-pills">{categories.map(c=><button key={c.name} className={activeCategory===c.name?'filter-pill selected':'filter-pill'} onClick={()=>setActiveCategory(c.name)}>{c.name}</button>)}</div>
          <div className="product-grid">
            {filteredProducts.map(p=><article className="product-card" key={p.id}><div className="product-image-wrap"><img src={p.image} alt={p.name} loading="lazy"/>{p.badge&&<span className="product-badge">{p.badge}</span>}<button className="quick-add" aria-label={`Tambah ${p.name} ke keranjang`} onClick={()=>setCart(c=>({...c,[p.id]:Math.min((c[p.id]||0)+1,p.stock)}))}><Plus size={19}/></button></div><div className="product-info"><span className="product-category">{p.category}</span><h3>{p.name}</h3><p>{p.description}</p><div className="product-bottom"><strong>{formatRp(p.price)}</strong><span className="stock-label">{p.stock>0?'Tersedia':'Stok habis'}</span></div><button className="add-cart-button" disabled={p.stock<=0} onClick={()=>setCart(c=>({...c,[p.id]:Math.min((c[p.id]||0)+1,p.stock)}))}><ShoppingCart size={16}/> Tambah ke keranjang</button></div></article>)}
          </div>
          {filteredProducts.length===0&&<div className="empty-state"><Search size={28}/><strong>Produk tidak ditemukan</strong><span>Coba kata kunci atau kategori lainnya.</span></div>}
          <p className="catalog-note"><ShieldCheck size={15}/> Harga dan ketersediaan pada tampilan demo perlu dikonfirmasi. Obat resep hanya dapat diproses setelah verifikasi resep oleh pihak berwenang.</p>
          <p className="connection-note"><span className={hasSupabaseConfig?'status-dot connected':'status-dot'}></span>{dbNotice}</p>
        </div>
      </section>

      <section className="consult-banner section-wrap">
        <div className="consult-art"><div className="art-circle"></div><div className="art-card"><MessageCircle size={31}/><span>Halo, ada yang ingin ditanyakan?</span><span className="art-dots">•••</span></div><div className="art-cross"><Plus size={25}/></div><div className="art-leaf"><Leaf size={40}/></div></div>
        <div className="consult-banner-copy"><span className="eyebrow">KAMI SIAP MEMBANTU</span><h2>Bingung soal obat yang kamu gunakan?</h2><p>Jangan ragu untuk bertanya. Konsultasikan cara penggunaan, aturan pakai, atau hal yang perlu diperhatikan bersama apoteker yang terverifikasi.</p><div className="consult-banner-actions"><button className="btn btn-primary" onClick={()=>void openConsult()}>Mulai konsultasi <ArrowRight size={17}/></button><a className="btn btn-whatsapp" href={`https://wa.me/${whatsapp}?text=${encodeURIComponent('Halo, saya ingin berkonsultasi mengenai penggunaan obat.')}`} target="_blank" rel="noreferrer"><MessageCircle size={17}/> WhatsApp</a></div><small className="privacy-note"><ShieldCheck size={14}/> Hindari mengirim data kesehatan sensitif melalui kanal yang belum diverifikasi.</small></div>
      </section>

      <section className="articles-section section-wrap" id="articles">
        <div className="section-heading"><div><span className="eyebrow">KENALI, PAHAMI, JAGA</span><h2>Bekal sehat setiap hari</h2><p>Informasi sederhana untuk membantu kamu lebih bijak menggunakan produk kesehatan.</p></div><a className="text-link" href="#about">Tentang Sefizlumia <ArrowRight size={16}/></a></div>
        <div className="article-grid">
          <article className="article-card"><img src="https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&w=900&q=85" alt="Tenaga kesehatan menjelaskan informasi obat" loading="lazy"/><div className="article-content"><span className="article-tag">INFORMASI OBAT</span><h3>Biasakan membaca label sebelum menggunakan obat</h3><p>Perhatikan aturan pakai, peringatan, tanggal kedaluwarsa, dan cara penyimpanan yang tertera pada kemasan.</p><span className="article-read"><BookOpen size={15}/> 3 menit membaca</span></div></article>
          <article className="article-card"><img src="https://images.unsplash.com/photo-1505751172876-fa1923c5c528?auto=format&fit=crop&w=900&q=85" alt="Peralatan pemeriksaan kesehatan" loading="lazy"/><div className="article-content"><span className="article-tag">TANYA APOTEKER</span><h3>Kapan sebaiknya bertanya kepada apoteker?</h3><p>Jika ragu mengenai aturan pakai, efek samping, alergi, atau penggunaan beberapa obat bersamaan, mintalah penjelasan profesional.</p><span className="article-read"><BookOpen size={15}/> 4 menit membaca</span></div></article>
          <article className="article-card"><img src="https://images.unsplash.com/photo-1506126613408-6e6a5a6a2c7b?auto=format&fit=crop&w=900&q=85" alt="Suasana tenang untuk menjaga kesehatan diri" loading="lazy"/><div className="article-content"><span className="article-tag">GAYA HIDUP</span><h3>Merawat diri dimulai dari kebiasaan kecil</h3><p>Menjaga pola tidur, makan seimbang, dan aktivitas fisik dapat menjadi bagian dari rutinitas sehat sehari-hari.</p><span className="article-read"><BookOpen size={15}/> 3 menit membaca</span></div></article>
        </div>
        <p className="article-disclaimer">Artikel ini bersifat edukasi umum, bukan pengganti diagnosis atau saran medis individual.</p>
      </section>

      <section className="values-section" id="about"><div className="section-wrap values-inner"><div><span className="eyebrow">TENTANG SEFIZLUMIA</span><h2>Lebih dekat dengan<br/>kepedulian kesehatan.</h2></div><p>Sefizlumia dirancang untuk memudahkan akses informasi produk kesehatan dan membuka jalan komunikasi dengan apoteker. Kami percaya informasi yang jelas membantu setiap orang mengambil keputusan kesehatan dengan lebih bijak.</p><div className="value-point"><span><BadgeCheck size={20}/></span><strong>Mengedepankan informasi yang jelas</strong></div><div className="value-point"><span><HeartPulse size={20}/></span><strong>Mendukung penggunaan obat yang bijak</strong></div></div></section>
    </main>

    <footer className="footer"><div className="section-wrap footer-main"><div className="footer-brand-col"><a className="brand footer-brand" href="#home"><span className="brand-mark"><Leaf size={22}/><span className="brand-cross">+</span></span><span className="brand-name">sefizlumia<span>APOTEK DIGITAL</span></span></a><p>Sahabat kesehatan Anda. Temukan informasi dan kebutuhan kesehatan dengan lebih mudah.</p><div className="social-row"><a href="#about" aria-label="Instagram"><Instagram size={17}/></a><a href={`https://wa.me/${whatsapp}`} target="_blank" rel="noreferrer" aria-label="WhatsApp"><MessageCircle size={17}/></a></div></div><div className="footer-col"><h4>Jelajahi</h4><a href="#home">Beranda</a><a href="#catalog">Katalog Obat</a><button onClick={()=>void openConsult()}>Konsultasi Apoteker</button><a href="#articles">Artikel Kesehatan</a></div><div className="footer-col"><h4>Informasi</h4><a href="#about">Tentang Kami</a><a href="#privacy">Kebijakan Privasi</a><a href="#terms">Ketentuan Layanan</a><span className="footer-muted"><MapPin size={15}/> Purwawinangun, Kec. Suranenggala, Kabupaten Cirebon, Jawa Barat 45152</span><a href="https://www.google.com/maps/search/?api=1&query=Purwawinangun%2C%20Kec.%20Suranenggala%2C%20Kabupaten%20Cirebon%2C%20Jawa%20Barat%2045152" target="_blank" rel="noreferrer">Lihat petunjuk lokasi <ArrowRight size={14}/></a></div><div className="footer-col footer-contact"><h4>Hubungi kami</h4><span><MessageCircle size={16}/> Konsultasi via WhatsApp</span><span><Mail size={16}/> Nomor kontak resmi belum diatur</span><a href={`https://wa.me/${whatsapp}?text=${encodeURIComponent('Halo, saya ingin berkonsultasi mengenai penggunaan obat.')}`} target="_blank" rel="noreferrer" className="footer-wa">Chat WhatsApp <ArrowRight size={15}/></a></div></div><div className="section-wrap footer-bottom"><span>© {new Date().getFullYear()} Sefizlumia. Semua hak dilindungi.</span><span><ShieldCheck size={14}/> Utamakan keamanan penggunaan obat</span></div><div className="demo-disclaimer">Tampilan pengembangan. Data produk, harga, kontak, profil apoteker, dan layanan harus diverifikasi sebelum digunakan untuk transaksi nyata.</div></footer>

    {cartOpen&&<div className="overlay" onMouseDown={e=>{if(e.target===e.currentTarget)setCartOpen(false)}}><aside className="side-drawer"><div className="drawer-header"><div><span className="eyebrow">SEFIZLUMIA</span><h2>Keranjangmu <span>({cartCount})</span></h2></div><button className="icon-button" onClick={()=>setCartOpen(false)} aria-label="Tutup keranjang"><X/></button></div>{cartItems.length===0?<div className="empty-state drawer-empty"><ShoppingBag size={34}/><strong>Keranjang masih kosong</strong><span>Yuk, cari kebutuhan kesehatanmu.</span><button className="btn btn-primary" onClick={()=>{setCartOpen(false);document.getElementById('catalog')?.scrollIntoView({behavior:'smooth'})}}>Lihat produk</button></div>:<><div className="drawer-items">{cartItems.map(p=><div className="cart-row" key={p.id}><img src={p.image} alt=""/><div className="cart-row-info"><strong>{p.name}</strong><span>{formatRp(p.price)}</span><div className="qty-controls"><button onClick={()=>setCart(c=>({...c,[p.id]:Math.max(0,(c[p.id]||0)-1)}))} aria-label="Kurangi"><Minus size={14}/></button><span>{cart[p.id]}</span><button onClick={()=>setCart(c=>({...c,[p.id]:Math.min(p.stock,(c[p.id]||0)+1)}))} disabled={cart[p.id]>=p.stock} aria-label="Tambah"><Plus size={14}/></button></div></div><button className="remove-item" onClick={()=>setCart(c=>({...c,[p.id]:0}))} aria-label="Hapus produk"><Trash2 size={16}/></button></div>)}</div><div className="drawer-footer"><div className="subtotal"><span>Subtotal</span><strong>{formatRp(cartTotal)}</strong></div><p>Biaya pengiriman belum dihitung. Harga dan stok perlu divalidasi saat checkout.</p><button className="btn btn-primary checkout-button" onClick={()=>{setCartOpen(false);setCheckoutOpen(true)}}>Lanjut ke pemesanan <ArrowRight size={17}/></button></div></>}</aside></div>}

    {authOpen&&<div className="overlay modal-overlay" onMouseDown={e=>{if(e.target===e.currentTarget)setAuthOpen(false)}}><section className="modal-card"><button className="modal-close icon-button" onClick={()=>setAuthOpen(false)} aria-label="Tutup"><X/></button><span className="modal-symbol"><UserRound size={24}/></span><span className="eyebrow">AKUN SEFIZLUMIA</span><h2>{authMode==='login'?'Selamat datang kembali':'Buat akun baru'}</h2><p>{authMode==='login'?'Masuk untuk mengakses konsultasi dan layanan akun.':'Daftar menggunakan email aktif milikmu.'}</p><form onSubmit={authenticate} className="stack-form"><label>Email<input type="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="nama@email.com"/></label><label>Kata sandi<input type="password" minLength={6} required value={password} onChange={e=>setPassword(e.target.value)} placeholder="Minimal 6 karakter"/></label><button className="btn btn-primary full-button" type="submit">{authMode==='login'?'Masuk':'Daftar'} <ArrowRight size={16}/></button></form>{authMessage&&<div className="inline-notice"><AlertCircle size={16}/>{authMessage}</div>}<div className="auth-switch">{authMode==='login'?'Belum punya akun?':'Sudah punya akun?'} <button onClick={()=>{setAuthMode(authMode==='login'?'signup':'login');setAuthMessage('')}}>{authMode==='login'?'Daftar':'Masuk'}</button></div><small className="form-hint">Peran akun baru adalah pengguna. Akses apoteker/admin harus diberikan secara aman oleh administrator.</small></section></div>}

    {consultOpen&&<div className="overlay modal-overlay" onMouseDown={e=>{if(e.target===e.currentTarget)setConsultOpen(false)}}><section className="modal-card consult-modal"><button className="modal-close icon-button" onClick={()=>setConsultOpen(false)} aria-label="Tutup"><X/></button><span className="modal-symbol"><MessageCircle size={24}/></span><span className="eyebrow">KONSULTASI APOTEKER</span><h2>Mulai percakapan</h2><p>Kirim pertanyaan mengenai penggunaan obat. Balasan hanya akan datang dari apoteker yang benar-benar masuk dan ditugaskan.</p>{consultStatus&&<div className="inline-notice"><AlertCircle size={16}/>{consultStatus}</div>}{consultationId&&supabase&&user?<><div className="chat-window">{messages.length===0?<div className="chat-empty"><MessageCircle size={23}/><span>Belum ada pesan. Sampaikan pertanyaanmu di bawah.</span></div>:messages.map(m=><div className={`chat-message ${m.sender_id===user.id?'mine':'theirs'}`} key={m.id}><p>{m.body}</p><time>{new Date(m.created_at).toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit'})}</time></div>)}<div ref={messagesEnd}/></div><form className="chat-composer" onSubmit={sendMessage}><input value={draft} onChange={e=>setDraft(e.target.value)} placeholder="Tulis pesan..." aria-label="Tulis pesan"/><button className="send-button" disabled={!draft.trim()||sending} aria-label="Kirim pesan"><Send size={17}/></button></form></>:<div className="consult-modal-actions"><button className="btn btn-primary full-button" onClick={()=>{if(!user){setConsultOpen(false);setAuthOpen(true)}else void openConsult()}}>{user?'Buat permintaan konsultasi':'Masuk untuk konsultasi'} <ArrowRight size={16}/></button><a className="btn btn-whatsapp full-button" href={`https://wa.me/${whatsapp}?text=${encodeURIComponent('Halo, saya ingin berkonsultasi mengenai penggunaan obat.')}`} target="_blank" rel="noreferrer"><MessageCircle size={17}/> Lanjut melalui WhatsApp</a><small>WhatsApp akan terbuka di aplikasi atau browser. Pesan belum terkirim sampai kamu menekan tombol kirim di WhatsApp.</small></div>}</section></div>}

    {checkoutOpen&&<div className="overlay modal-overlay" onMouseDown={e=>{if(e.target===e.currentTarget)setCheckoutOpen(false)}}><section className="modal-card checkout-modal"><button className="modal-close icon-button" onClick={()=>setCheckoutOpen(false)} aria-label="Tutup"><X/></button><span className="eyebrow">RINGKASAN PESANAN</span><h2>Informasi pemesanan</h2><div className="checkout-summary">{cartItems.map(p=><div key={p.id}><span>{p.name} × {cart[p.id]}</span><strong>{formatRp(p.price*cart[p.id])}</strong></div>)}<div className="checkout-total"><span>Subtotal demo</span><strong>{formatRp(cartTotal)}</strong></div></div><form onSubmit={placeOrder} className="stack-form"><label>Nama penerima<input required value={customerName} onChange={e=>setCustomerName(e.target.value)} placeholder="Nama lengkap"/></label><label>Nomor telepon<input required value={customerPhone} onChange={e=>setCustomerPhone(e.target.value)} placeholder="08xxxxxxxxxx"/></label><label>Alamat pengiriman<textarea required value={customerAddress} onChange={e=>setCustomerAddress(e.target.value)} placeholder="Alamat lengkap" rows={3}/></label><button className="btn btn-primary full-button" type="submit">Kirim permintaan pemesanan <ArrowRight size={16}/></button></form>{orderMessage&&<div className="inline-notice"><AlertCircle size={16}/>{orderMessage}</div>}<small className="form-hint">Belum ada pembayaran. Pesanan tidak akan dianggap berhasil sebelum validasi backend tersedia.</small></section></div>}
  </div>
}
