function say_hello()
{
    console.log("Hello World","from",document.location.host,document.location.pathname)
}



let record_functions= [
    say_hello
];
let replay_functions= [
    say_hello
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