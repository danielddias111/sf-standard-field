public class SOQLBasic {

    public static void test(){
        List<Account> accList = [select industry from account];
        List<Lead> lLieadst = [select name, industry from lead];
    }
}