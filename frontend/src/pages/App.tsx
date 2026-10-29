import { useEffect, useMemo, useState } from 'react'
import { ArrowDown, ArrowRight, ChevronLeft, ChevronRight, Compass, Search, Sparkles, Stars } from 'lucide-react'
import { isAbortError, loadCharacters } from '../services/characterDataService'
import type { UserCharacter } from '../types/character'
import { buildZodiacIndex, filterCharacters, matchCharacter, traitsFromAnswers } from '../utils/matching'
import { SIGNS, zodiacFromDate } from '../utils/zodiac'

const QUIZ = [
  ['In a group, you tend to…','Take the lead','Build consensus','Observe first'],
  ['When deciding, you trust…','Clear logic','Your instincts','A little of both'],
  ['A new opportunity feels…','Worth the risk','Better with a plan','Depends on the stakes'],
  ['Your ideal recharge is…','Time with people','Quiet time','A change of scene'],
  ['Plans should be…','Carefully mapped','Open to surprise','Flexible but grounded'],
  ['During conflict, you…','Address it directly','Look for common ground','Pause before responding'],
  ['When someone needs help…','Step in right away','Ask what they need','Find a practical solution'],
  ['A challenge makes you…','More determined','More curious','Look for another route'],
]

export default function App() {
  const [characters, setCharacters] = useState<UserCharacter[]>([])
  const [loading, setLoading] = useState(true), [error, setError] = useState('')
  const [view, setView] = useState<'home'|'explore'|'result'>('home')
  const [inputMode, setInputMode] = useState<'sign'|'date'>('sign'), [sign, setSign] = useState(''), [birthDate, setBirthDate] = useState('')
  const [universe, setUniverse] = useState('All universes'), [selectedGenres, setSelectedGenres] = useState<string[]>([]), [quizOpen, setQuizOpen] = useState(false), [answers, setAnswers] = useState<number[]>(Array(8).fill(-1))
  const [match, setMatch] = useState<ReturnType<typeof matchCharacter>>(null)
  const [userName, setUserName] = useState(''), [photoPreview, setPhotoPreview] = useState(''), [photoError, setPhotoError] = useState(''), [loadAttempt, setLoadAttempt] = useState(0), [paragraph, setParagraph] = useState('')
  const [query, setQuery] = useState(''), [debouncedQuery, setDebouncedQuery] = useState(''), [exploreUniverse, setExploreUniverse] = useState('All universes'), [exploreGenre, setExploreGenre] = useState('All genres'), [page, setPage] = useState(1)
  useEffect(() => {
    const controller = new AbortController()
    setLoading(true); setError('')
    loadCharacters(controller.signal)
      .then(setCharacters)
      .catch(e => { if (!controller.signal.aborted && !isAbortError(e)) setError(e instanceof Error ? e.message : 'Could not load the character catalog.') })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [loadAttempt])
  useEffect(() => () => { if (photoPreview) URL.revokeObjectURL(photoPreview) }, [photoPreview])
  useEffect(() => { const timer = window.setTimeout(() => { setDebouncedQuery(query); setPage(1) }, 180); return () => window.clearTimeout(timer) }, [query])
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'smooth' }) }, [view])
  const universes = useMemo(() => [...new Set(characters.map(c => c.universe))].sort(), [characters])
  const availableGenres = useMemo(() => [...new Set(characters.flatMap(c => c.genres))].sort(), [characters])
  const zodiacIndex = useMemo(() => buildZodiacIndex(characters), [characters])
  const currentSign = inputMode === 'date' ? zodiacFromDate(birthDate) : sign
  const catalog = useMemo(() => filterCharacters(characters, { query: debouncedQuery, universe: exploreUniverse, genres: exploreGenre === 'All genres' ? [] : [exploreGenre], page, pageSize: 24 }), [characters, debouncedQuery, exploreGenre, exploreUniverse, page])
  const findMatch = (avoidCharacterId?: string) => {
    const next = matchCharacter(zodiacIndex, { zodiac: currentSign ?? '', universe, genres: selectedGenres, traits: traitsFromAnswers(answers), avoidCharacterId })
    setMatch(next)
    const choices = next?.character.paragraphs ?? []
    const available = choices.filter(value => value !== paragraph)
    setParagraph(available.length ? available[Math.floor(Math.random() * available.length)] : choices[0] ?? '')
    setView('result')
  }
  const onPhotoChange = (file?: File) => {
    setPhotoError('')
    if (!file) { setPhotoPreview(''); return }
    if (!['image/jpeg','image/png','image/webp','image/gif'].includes(file.type)) { setPhotoPreview(''); setPhotoError('Choose a JPG, PNG, WebP, or GIF image.'); return }
    if (file.size > 5 * 1024 * 1024) { setPhotoPreview(''); setPhotoError('Choose an image under 5 MB.'); return }
    setPhotoPreview(URL.createObjectURL(file))
  }
  const toggleGenre = (genre: string) => setSelectedGenres(old => old.includes(genre) ? old.filter(value => value !== genre) : old.length < 3 ? [...old, genre] : old)

  return <div className="app-shell">
    <header className="topbar"><a className="brand" href="#top" onClick={() => setView('home')}><span className="brand-mark"><Stars size={18}/></span> COSMIC <b>CASTING</b></a><nav aria-label="Main navigation"><button className={view==='home'?'nav-active':''} onClick={() => setView('home')}>Discover</button><button className={view==='explore'?'nav-active':''} onClick={() => setView('explore')}>Character library <span className="nav-count">{characters.length || '—'}</span></button></nav><span className="topbar-note"><span className="live-dot"/> THE CHARACTER ARCHIVE</span></header>
    {error && <div className="error-banner" role="alert"><span>Could not load the character archive. {error}</span><button onClick={() => { setError(''); setLoadAttempt(value => value + 1) }}>Try again</button></div>}
    {view === 'home' && <main id="top">
      <section className="hero"><div className="hero-glow"/><div className="hero-copy"><div className="eyebrow"><span/> PERSONALITY, WRITTEN IN THE STARS</div><h1>Discover your<br/><em>cinematic</em> character.</h1><p>Find the fictional character that matches your cosmic sign, cinematic preferences, and personality.</p><div className="hero-actions"><button className="button-primary" onClick={() => document.getElementById('match-form')?.scrollIntoView({behavior:'smooth'})}>Find my character <ArrowRight size={17}/></button><button className="button-quiet" onClick={() => setView('explore')}>Explore characters <ArrowDown size={15}/></button></div><div className="hero-foot"><div className="avatar-stack"><i>A</i><i>✦</i><i>◈</i></div><span>Stories connect us.<br/><b>Find your kindred spirit.</b></span></div></div><div className="hero-art" aria-label="Abstract starry night illustration"><div className="orbit orbit-one"/><div className="orbit orbit-two"/><div className="planet"><span>✦</span></div><div className="star star-a">✦</div><div className="star star-b">·</div><div className="star star-c">✧</div><div className="art-caption">A universe of stories <span>✦</span> one match away</div></div><div className="hero-index">01 <span>/</span> 03</div></section>
      <section className="match-section" id="match-form"><div className="section-heading"><div><div className="eyebrow"><span/> YOUR STORY STARTS HERE</div><h2>Let the stars <em>cast you.</em></h2></div><span className="step-label">01 <i>—</i> YOUR COSMIC SIGN</span></div>
        <div className="form-grid"><div className="form-main"><h3>Do you know your zodiac sign?</h3><div className="mode-tabs"><button className={inputMode==='sign'?'selected':''} onClick={() => setInputMode('sign')}>I know my zodiac</button><button className={inputMode==='date'?'selected':''} onClick={() => setInputMode('date')}>Find my zodiac</button></div>{inputMode==='sign'?<label className="field-label" htmlFor="sign">Zodiac sign<select id="sign" value={sign} onChange={e=>setSign(e.target.value)}><option value="">Choose your sign</option>{SIGNS.map(s=><option key={s}>{s}</option>)}</select></label>:<label className="field-label" htmlFor="birth">Date of birth<input id="birth" type="date" value={birthDate} max={new Date().toISOString().slice(0,10)} onChange={e=>setBirthDate(e.target.value)}/>{birthDate && !currentSign && <small className="field-error">Enter a valid date in the past.</small>}{currentSign && <small className="calculated">Your sign is <b>{currentSign}</b></small>}</label>}
          <div className="personal-inputs"><label className="field-label" htmlFor="name">Your name <span className="optional-label">OPTIONAL</span><input id="name" type="text" maxLength={60} autoComplete="given-name" placeholder="What should we call you?" value={userName} onChange={e=>setUserName(e.target.value)}/><small>Used only for a greeting. It does not affect your match.</small></label><div className="field-label">Your photo <span className="optional-label">OPTIONAL · PRIVATE</span><div className="photo-control">{photoPreview?<img className="photo-preview" src={photoPreview} alt="Local preview of your selected photo" onError={()=>{setPhotoPreview('');setPhotoError('That image could not be previewed.')}}/>:<div className="photo-placeholder">＋</div>}<label className="photo-button">{photoPreview?'Change photo':'Choose photo'}<input type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={e=>{onPhotoChange(e.currentTarget.files?.[0]);e.currentTarget.value=''}}/></label>{photoPreview&&<button type="button" className="remove-photo" onClick={()=>onPhotoChange()}>Remove</button>}</div><small>Preview stays in this browser tab. It is never uploaded or used to infer traits.</small>{photoError&&<small className="field-error" role="alert">{photoError}</small>}</div></div>
          <div className="field-row"><label className="field-label" htmlFor="universe">Cinematic universe<select id="universe" value={universe} onChange={e=>setUniverse(e.target.value)}><option>All universes</option>{universes.map(x=><option key={x}>{x}</option>)}</select><small>Options are drawn from your character archive.</small></label><div className="field-label">Genres <span className="optional-label">OPTIONAL · UP TO 3</span>{availableGenres.length?<div className="genre-pills">{availableGenres.map(genre=><button type="button" key={genre} className={`genre-pill ${selectedGenres.includes(genre)?'selected':''}`} aria-pressed={selectedGenres.includes(genre)} onClick={()=>toggleGenre(genre)}>{genre}</button>)}</div>:<small>Genre tags haven’t been verified for this collection.</small>}{availableGenres.length>0&&<small>{selectedGenres.length}/3 selected</small>}</div></div>
          <div className="quiz-toggle"><div className="quiz-icon"><Sparkles size={17}/></div><div><b>Want to add a little more you?</b><p>Take the optional 8-question personality quiz.</p></div><button className="text-button" onClick={()=>setQuizOpen(v=>!v)}>{quizOpen?'Hide quiz':answers.some(v=>v>=0)?'Edit quiz':'Take quiz'} <ArrowRight size={15}/></button></div>
          {quizOpen && <div className="quiz-panel"><div className="quiz-note">Just for fun. This is not a scientific personality assessment.</div>{QUIZ.map(([question,...choices],i)=><fieldset key={question} className="quiz-question"><legend>{String(i+1).padStart(2,'0')} &nbsp; {question}</legend><div>{choices.map((choice,j)=><button type="button" key={choice} className={answers[i]===j?'answer selected':''} onClick={()=>setAnswers(old=>old.map((v,k)=>k===i?j:v))}>{choice}</button>)}</div></fieldset>)}<button className="text-button" onClick={()=>{setAnswers(Array(8).fill(-1));setQuizOpen(false)}}>Skip and clear quiz</button></div>}
          <button className="button-primary find-button" disabled={!currentSign || loading || !!error} onClick={()=>findMatch()}>Find my character <ArrowRight size={17}/></button>
        </div><aside className="form-aside"><div className="aside-symbol">✧</div><span className="eyebrow">A NOTE FROM THE ARCHIVE</span><p>Your sign is yours to share. We use it only to explore character associations in this collection.</p><div className="aside-rule"/><div className="archive-stat"><b>{loading?'…':characters.length}</b><span>characters in<br/>the archive</span></div></aside></div>
      </section>
      <footer className="footer"><div className="brand"><span className="brand-mark"><Stars size={17}/></span> COSMIC <b>CASTING</b></div><span>A story is waiting to find you.</span><button onClick={()=>setView('explore')}>Browse the archive <ArrowRight size={14}/></button></footer>
    </main>}
    {view === 'result' && <main className="state-page"><button className="back-link" onClick={()=>setView('home')}><ChevronLeft size={16}/> Back to discovery</button><div className="empty-result"><div className="empty-orbit">{photoPreview?<img src={photoPreview} alt="Your photo preview"/>:<Stars size={38}/>}</div><div className="eyebrow"><span/> {match?'YOUR CHARACTER MATCH':'THE ARCHIVE IS STILL GROWING'}</div><h1>{match ? `${userName.trim()?`${userName.trim()}, meet your`: 'Meet your'} cinematic match.` : `Your sign isn’t in the archive yet${userName.trim()?`, ${userName.trim()}`:''}.`}</h1><p>{match ? `A ${currentSign} match from the ${match.character.universe} universe${match.personalityScore === undefined ? '.' : ` · ${Math.round(match.personalityScore*100)}% trait overlap.`}` : `We don’t have verified ${currentSign || 'zodiac'} associations in the scraped collection. We won’t guess at a match.`}</p>{match&&<><CharacterCard character={match.character}/><div className="match-explanation">{paragraph?<p>{paragraph}</p>:<p>No curated character description is available for this record yet.</p>}<small>Matches are based on explicit dataset associations and optional quiz traits. This is for entertainment, not a scientific assessment.</small></div><div className="result-actions"><button className="button-primary" onClick={()=>findMatch(match.character.id)}>Find another match <ArrowRight size={16}/></button>{match.character.sourceUrl&&<a className="button-quiet" href={match.character.sourceUrl} target="_blank" rel="noreferrer">View source ↗</a>}</div></>}<div className="empty-actions"><button className="button-primary" onClick={()=>setView('explore')}>Explore all characters <Compass size={17}/></button><button className="button-quiet" onClick={()=>setView('home')}>Change preferences</button></div><small>Birth dates, zodiac links, genres, and personality traits are not currently verified for most records in this collection.</small></div></main>}
    {view === 'explore' && <main className="explore-page"><div className="explore-head"><div><div className="eyebrow"><span/> THE CHARACTER ARCHIVE</div><h1>Every story has<br/><em>a starting point.</em></h1><p>Browse the characters gathered from the existing source collection.</p></div><div className="explore-stat"><b>{catalog.total}</b><span>characters shown</span></div></div><div className="library-toolbar"><label className="search-box"><Search size={18}/><input aria-label="Search characters" placeholder="Search a character or alias…" value={query} onChange={e=>setQuery(e.target.value)}/>{query&&<button onClick={()=>setQuery('')} aria-label="Clear search">×</button>}</label><label className="select-wrap"><span>UNIVERSE</span><select value={exploreUniverse} onChange={e=>{setExploreUniverse(e.target.value);setPage(1)}}><option>All universes</option>{universes.map(u=><option key={u}>{u}</option>)}</select></label>{availableGenres.length>0&&<label className="select-wrap"><span>GENRE</span><select value={exploreGenre} onChange={e=>{setExploreGenre(e.target.value);setPage(1)}}><option>All genres</option>{availableGenres.map(genre=><option key={genre}>{genre}</option>)}</select></label>}</div>
      <div className="archive-note"><span>ⓘ</span> Source data contains names and citations, but no licensed character images, genre tags, or zodiac associations. The library shows records as collected.</div>
      {loading?<div className="loading">Loading the archive<span>✦</span></div>:catalog.results.length?<><div className="character-grid">{catalog.results.map(c=><CharacterCard key={c.id} character={c}/>)}</div><div className="pagination"><span>Showing {Math.min((catalog.page-1)*24+1,catalog.total)}–{Math.min(catalog.page*24,catalog.total)} of {catalog.total}</span><div><button disabled={page<=1} onClick={()=>setPage(p=>p-1)} aria-label="Previous page"><ChevronLeft size={18}/></button><span>{catalog.page} / {catalog.pageCount}</span><button disabled={page>=catalog.pageCount} onClick={()=>setPage(p=>p+1)} aria-label="Next page"><ChevronRight size={18}/></button></div></div></>:<div className="no-results"><Search size={25}/><h3>No characters found</h3><p>Try another name or universe.</p></div>}
    </main>}
  </div>
}

function CharacterCard({character}:{character:UserCharacter}) {
  const [failed,setFailed]=useState(false)
  return <article className="character-card"><div className="card-art">{character.imageUrl&&!failed?<img src={character.imageUrl} alt={`${character.name}`} loading="lazy" onError={()=>setFailed(true)}/>:<div className="card-placeholder"><span>✦</span><b>{character.name.slice(0,1).toUpperCase()}</b><small>IMAGE UNAVAILABLE</small></div>}<span className="card-universe">{character.universe}</span></div><div className="card-info"><span className="card-franchise">{character.franchise||character.universe}</span><h3>{character.name}</h3>{character.description?<p>{character.description}</p>:<p className="muted">No character description was available in the scraped record.</p>}<div className="card-meta">{character.zodiacSigns.length>0&&<span>✧ {character.zodiacSigns.join(' · ')}</span>}{character.sourceUrl&&<a href={character.sourceUrl} target="_blank" rel="noreferrer">SOURCE ↗</a>}</div></div></article>
}
