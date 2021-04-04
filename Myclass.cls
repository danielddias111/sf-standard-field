public class dependencyClass {
    String Industry;
		//SObjectField field 	= Lead.Industry;
		//Yet another comment
		/*SObjectField field 	= Lead.Industry*/
		/*this is some comment in two line
		SObjectField field 	= Lead.Industry*/
    public static void test(){
        SObjectField field 	= Lead.Industry;
        Lead myLead 		= [select id , industry from Lead][0];
        String ind			= myLead.Industry;
        Lead a 					= new Lead(Industry='Auto');
        a.Industry 			= null;
    }
} 