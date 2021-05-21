


const today = (new Date()).toISOString().split('T')[0];
this.getField("b Date").value = today;
this.getField("b Date").readonly = true;



const today = (new Date()).toISOString().split('T')[0];
this.getField("b Date_2").value = today;
this.getField("b Date_2").readonly = true;




const today = (new Date()).toISOString().split('T')[0];
this.getField("b Date_3").value = today;
this.getField("b Date_3").readonly = true;



function HideFieldsLosingCommand() {

    const hideFields = ["16a Losing Command","b UIC","c Ship From","d. PBO_1"]

    for ( var i=0; i < this.numFields; i++) {
        var fname = this.getNthFieldName(i);
        var f = this.getField(fname);
        if ( (f.type != "button") && hideFields.includes(fname)) {
            f.readonly = true;
        }
    }
}
const today = (new Date()).toISOString().split('T')[0];
this.getField("f Date").value = today;
this.getField("f Date").readonly = true;
HideFieldsLosingCommand();



function HideFieldsGainingCommand() {

    const hideFields = ["f Date_2","17a Gaining Command","b UIC_2","c Ship To","d. PBO_2"]

    for ( var i=0; i < this.numFields; i++) {
        var fname = this.getNthFieldName(i);
        var f = this.getField(fname);
        if ( (f.type != "button") && hideFields.includes(fname)) {
            f.readonly = true;
        }
    }
}

const hideFields = ["f Date_2","17a Gaining Command","b UIC_2","c Ship To","d. PBO_2"]
const today = (new Date()).toISOString().split('T')[0];
this.getField("f Date_2").value = today;
for ( var i=0; i < this.numFields; i++) {
	var fname = this.getNthFieldName(i);
	var f = this.getField(fname);
	if (hideFields.includes(fname)) {
		f.readonly = true;
	}
}


const today = (new Date()).toISOString().split('T')[0];
this.getField("b Date_4").value = today;
this.getField("b Date_4").readonly = true;


const today = (new Date()).toISOString().split('T')[0];
this.getField("b Date_5").value = today;
this.getField("b Date_5").readonly = true;

