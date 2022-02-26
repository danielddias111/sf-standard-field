public class SOQLParent {
    public static void test(){
        List<Opportunity> d= [select account.industry from Opportunity];
    }
}