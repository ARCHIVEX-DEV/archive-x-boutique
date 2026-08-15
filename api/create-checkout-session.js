const Stripe=require("stripe");
const stripe=new Stripe(process.env.STRIPE_SECRET_KEY);

const PRODUCTS={
 "n°1":{name:"ARCHIVE X PACK 01",price:2000},
 "n°2":{name:"ARCHIVE X PACK 02",price:3000},
 "n°3":{name:"ARCHIVE X PACK 03",price:4000},
 "n°4":{name:"ARCHIVE X PACK 04",price:5000}
};

const PROMOS={"100":100,"2KR":50,"4KR":50,"BOUTIQUE":25,"MATRIX":30,"NIGHT":15,"CODE":10,"CHATGPT":35,"OSINT":5,"PY":40,"FLY":20,"AZERTY":45};

module.exports=async(req,res)=>{
 if(req.method!=="POST")return res.status(405).json({error:"Méthode non autorisée."});
 try{
  for(const k of ["STRIPE_SECRET_KEY","STRIPE_PUBLISHABLE_KEY","RECAPTCHA_SECRET_KEY"])
   if(!process.env[k])throw new Error(`${k} n’est pas configurée sur Vercel.`);

  const{cart,recaptchaToken,promoCode,discordUsername,discordId}=req.body||{};
  if(!Array.isArray(cart)||!cart.length)return res.status(400).json({error:"Panier vide."});
  if(!recaptchaToken)return res.status(400).json({error:"reCAPTCHA requis."});

  const captcha=await fetch("https://www.google.com/recaptcha/api/siteverify",{
   method:"POST",
   headers:{"Content-Type":"application/x-www-form-urlencoded"},
   body:new URLSearchParams({secret:process.env.RECAPTCHA_SECRET_KEY,response:recaptchaToken})
  });
  if(!(await captcha.json()).success)return res.status(403).json({error:"Vérification reCAPTCHA refusée."});

  const code=String(promoCode||"").trim().toUpperCase();
  const discount=Object.prototype.hasOwnProperty.call(PROMOS,code)?PROMOS[code]:0;
  if(promoCode&&!discount)return res.status(400).json({error:"Code promo invalide."});

  const line_items=cart.map(item=>{
   const p=PRODUCTS[item.id];
   if(!p)throw new Error("Produit invalide dans le panier.");
   const quantity=Math.max(1,Math.min(99,Number(item.quantity)||1));
   const unit_amount=discount&&discount<100?Math.max(1,Math.round(p.price*(100-discount)/100)):p.price;
   return{price_data:{currency:"eur",product_data:{name:p.name},unit_amount},quantity};
  });

  const siteUrl=(process.env.PUBLIC_SITE_URL||`https://${req.headers.host}`).replace(/\/$/,"");
  const metadata={};
  if(discordUsername)metadata.discord_username=String(discordUsername).slice(0,500);
  if(discordId)metadata.discord_id=String(discordId).slice(0,500);
  if(code)metadata.promo_code=code;

  const params={
   mode:"payment",
   ui_mode:"embedded",
   line_items,
   billing_address_collection:"auto",
   metadata,
   return_url:`${siteUrl}/?payment=success&session_id={CHECKOUT_SESSION_ID}`
  };

  if(discount===100){
   const coupon=await stripe.coupons.create({percent_off:100,duration:"once",name:`ARCHIVE X ${code}`});
   params.discounts=[{coupon:coupon.id}];
  }else if(!code){
   params.allow_promotion_codes=true;
  }

  const session=await stripe.checkout.sessions.create(params);
  return res.status(200).json({clientSecret:session.client_secret,publishableKey:process.env.STRIPE_PUBLISHABLE_KEY});
 }catch(error){
  console.error(error);
  return res.status(500).json({error:error.message||"Erreur serveur Stripe."});
 }
};
