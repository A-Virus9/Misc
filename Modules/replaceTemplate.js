module.exports = (temp, product)=>{
    let availableOptions = product.options.map(el => `<div class="option">${el}</div>`)
    let output = temp.replace(/{%QUESTION%}/g,product.question)
    output = output.replace(/{%CORRECT%}/g,product.correct)
    output = output.replace(/{%OPTIONS%}/g,availableOptions.join(''))
    return output
}