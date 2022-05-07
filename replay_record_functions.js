


function enable_all_buttons()
{
    setInterval(z=>{
            document.querySelectorAll("[disabled]").forEach(z=>{
                z.removeAttribute("disabled")
            })
    },1000)
}
function autoclickOnSomeSelectors()
{
    let selectors= [
        '#course.end .nextslide.custback',    
        'button[data-slide="next"]'
    ].join(",")|| "noselector";
    let disablerSelectors=  [
        //"#course.end"
    ].join(",") || "noselector";
    let disablerHtmls=  [`Sortir <i class="fa fa-share"></i></a>`]
    setInterval(     z=>   {
        if(document.querySelector(disablerSelectors))
        {
            return;
        }
        for (let i = 0; i < disablerHtmls.length; i++) {
            const element = disablerHtmls[i];
            if(document.documentElement.innerHTML.includes(element))
            {
                return;
            }   
        }
        
        let selectResult = document.querySelector(selectors);
        if(selectResult)
        {
            selectResult.click();
        }
    }
    ,2000)
}

function say_hello()
{
    console.log("Hello World","from",document.location.host,document.location.pathname)
}

let record_functions= [
    enable_all_buttons,autoclickOnSomeSelectors
];
let replay_functions= [
    enable_all_buttons
];

function loader(frame,functions){
    
        functions.forEach(f => {
            //console.log("Exec",f,"on",response.url())
            try
            {
                 frame.evaluate(f)
            }
            catch(err)
            {
                console.error(f,"crashed with error",err)
            }
        })
        
    
}

// export default { record_functions: record_functions }  // Equivalent afaik
export default { record_functions,replay_functions,loader } 