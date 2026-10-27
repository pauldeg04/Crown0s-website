/* ==========================================================================
   Crown Head Spa — Promo poster carousel (promos.html)

   Reads the promoPosters collection that staff manage in CrownOS
   (Marketing > Promo Posters), keeps the active, unexpired posters in
   their saved order and plays them as an auto-advancing slideshow.
   The whole section stays hidden if there are no posters or the
   lookup fails, so the page never shows an empty box.
   ========================================================================== */

(function(){
  const AUTOPLAY_MS = 5000;
  const section = document.getElementById("promoCarouselSection");

  if(!section || !window.firebase || !firebase.apps || firebase.apps.length === 0){
    return;
  }

  const track = section.querySelector(".promo-carousel-track");
  const dotsEl = section.querySelector(".promo-carousel-dots");
  const stage = section.querySelector(".promo-carousel");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  let slides = [];
  let index = 0;
  let timer = null;

  function todayKey(){
    const now = new Date();
    const pad = function(n){ return String(n).padStart(2, "0"); };
    return now.getFullYear() + "-" + pad(now.getMonth() + 1) + "-" + pad(now.getDate());
  }

  function show(i){
    index = (i + slides.length) % slides.length;
    track.style.transform = "translateX(" + (-100 * index) + "%)";

    slides.forEach(function(slide, n){
      slide.setAttribute("aria-hidden", n === index ? "false" : "true");
    });

    dotsEl.querySelectorAll("button").forEach(function(dot, n){
      dot.classList.toggle("active", n === index);
      dot.setAttribute("aria-current", n === index ? "true" : "false");
    });
  }

  function stop(){
    clearInterval(timer);
    timer = null;
  }

  function start(){
    stop();

    if(!reduceMotion && slides.length > 1){
      timer = setInterval(function(){ show(index + 1); }, AUTOPLAY_MS);
    }
  }

  function build(posters){
    posters.forEach(function(poster, n){
      const slide = document.createElement("div");
      slide.className = "promo-carousel-slide";
      slide.setAttribute("role", "group");
      slide.setAttribute("aria-label", "Promo " + (n + 1) + " of " + posters.length);

      const img = document.createElement("img");
      img.src = poster.imageUrl;
      img.alt = poster.title || "Crown Head Spa promo";
      img.decoding = "async";
      if(n > 0){
        img.loading = "lazy";
      }
      slide.appendChild(img);
      track.appendChild(slide);

      const dot = document.createElement("button");
      dot.type = "button";
      dot.setAttribute("aria-label", "Show promo " + (n + 1));
      dot.addEventListener("click", function(){ show(n); start(); });
      dotsEl.appendChild(dot);
    });

    slides = Array.from(track.children);

    /* Size the stage to the first poster so portrait posters aren't squashed. */
    const first = track.querySelector("img");
    const applyRatio = function(){
      if(first.naturalWidth && first.naturalHeight){
        stage.style.aspectRatio = first.naturalWidth + " / " + first.naturalHeight;
      }
    };
    if(first.complete){ applyRatio(); } else { first.addEventListener("load", applyRatio); }

    const multiple = slides.length > 1;
    section.querySelectorAll(".promo-carousel-arrow").forEach(function(btn){
      btn.hidden = !multiple;
    });
    dotsEl.hidden = !multiple;

    section.querySelector(".promo-carousel-prev").addEventListener("click", function(){ show(index - 1); start(); });
    section.querySelector(".promo-carousel-next").addEventListener("click", function(){ show(index + 1); start(); });

    stage.addEventListener("mouseenter", stop);
    stage.addEventListener("mouseleave", start);
    stage.addEventListener("focusin", stop);
    stage.addEventListener("focusout", start);
    document.addEventListener("visibilitychange", function(){
      if(document.hidden){ stop(); } else { start(); }
    });

    /* Swipe on touch screens. */
    let startX = null;
    stage.addEventListener("touchstart", function(e){ startX = e.touches[0].clientX; stop(); }, { passive: true });
    stage.addEventListener("touchend", function(e){
      if(startX !== null){
        const dx = e.changedTouches[0].clientX - startX;
        if(Math.abs(dx) > 40){ show(index + (dx < 0 ? 1 : -1)); }
      }
      startX = null;
      start();
    });

    show(0);
    section.hidden = false;
    start();
  }

  firebase.firestore().collection("promoPosters").get().then(function(snapshot){
    const today = todayKey();

    const posters = snapshot.docs
      .map(function(doc){ return doc.data(); })
      .filter(function(p){
        return p.imageUrl && p.active !== false && !(p.showUntil && p.showUntil < today);
      })
      .sort(function(a, b){ return (Number(a.order) || 0) - (Number(b.order) || 0); });

    if(posters.length){
      build(posters);
    }
  }).catch(function(error){
    console.warn("Promo posters unavailable:", error);
  });
})();
