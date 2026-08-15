const Stripe=require("stripe");
const stripe=new Stripe(process.env.STRIPE_SECRET_KEY);

module.exports=async(req,res)=>{
 if(req.method!=="POST")return res.status(405).json({error:"Méthode non autorisée."});
 if(!process.env.STRIPE_WEBHOOK_SECRET||!process.env.ARCHIVE_X_WEBHOOK)
  return res.status(500).json({error:"Configuration webhook incomplète."});

 try{
  const signature=req.headers["stripe-signature"];
  if(!signature)return res.status(400).json({error:"Signature Stripe manquante."});

  let raw=req.body;
  if(Buffer.isBuffer(raw))raw=raw.toString();
  else if(typeof raw!=="string")raw=JSON.stringify(raw);

  const event=stripe.webhooks.constructEvent(raw,signature,process.env.STRIPE_WEBHOOK_SECRET);
  if(event.type!=="checkout.session.completed"&&event.type!=="payment_intent.succeeded")
   return res.status(200).json({received:true});

  if(event.type==="payment_intent.succeeded")return res.status(200).json({received:true});

  const session=await stripe.checkout.sessions.retrieve(event.data.object.id,{expand:["line_items.data.price.product"]});
  const items=session.line_items?.data||[];
  const products=items.map(i=>{
   const p=i.price?.product;
   return `• ${typeof p==="object"&&p?.name?p.name:"Produit ARCHIVE X"} × ${i.quantity||1} — ${((i.amount_total||0)/100).toFixed(2)} €`;
  }).join("\n")||"• Informations produits non disponibles";

  const discordId=session.metadata?.discord_id;
  const discordName=session.metadata?.discord_username||"Nom Discord non transmis";
  const discord=discordId?`<@${discordId}>`:discordName;
  const total=((session.amount_total||0)/100).toFixed(2);
  const currency=(session.currency||"eur").toUpperCase();
  const email=session.customer_details?.email||"Non renseigné";

  const response=await fetch(process.env.ARCHIVE_X_WEBHOOK,{
   method:"POST",
   headers:{"Content-Type":"application/json"},
   body:JSON.stringify({username:"ARCHIVE X",embeds:[{
    title:"💰 NOUVEAU PAIEMENT",
    description:"Un paiement Stripe vient d’être confirmé.",
    color:16777215,
    fields:[
     {name:"👤 Discord",value:discord},
     {name:"📦 Commande",value:products},
     {name:"💵 Montant",value:`${total} ${currency}`,inline:true},
     {name:"📧 Email",value:email,inline:true},
     {name:"🧾 Session Stripe",value:`\`${session.id}\``}
    ],
    footer:{text:"ARCHIVE X • Stripe"},
    timestamp:new Date().toISOString()
   }]})
  });

  if(!response.ok)throw new Error(`Discord ${response.status}: ${await response.text()}`);
  return res.status(200).json({received:true});
 }catch(error){
  console.error(error);
  return res.status(400).json({error:error.message||"Webhook Stripe invalide."});
 }
};

module.exports.config={api:{bodyParser:false}};
